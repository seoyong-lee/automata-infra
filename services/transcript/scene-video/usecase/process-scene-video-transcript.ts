import {
  parseSceneVideoTranscript,
  type SceneVideoTranscript,
} from "../../../shared/lib/contracts/video-transcript";
import { getSceneAsset } from "../../../shared/lib/store/video-jobs";
import {
  buildSrtFromSegments,
  buildVttFromSegments,
  normalizeSceneVideoTranscriptArtifact,
} from "../mapper/normalize-scene-video-transcript";
import {
  loadSceneVideoTranscriptionOutputs,
  startSceneVideoTranscriptionJob,
  waitForSceneVideoTranscriptionJob,
} from "../repo/aws-transcribe-scene-video";
import {
  saveSceneVideoTranscriptArtifacts,
  saveSceneVideoTranscriptState,
} from "../repo/scene-video-transcript-store";

const PREVIEW_MAX_LENGTH = 400;
type SceneVideoTranscriptRunState = {
  startedAt: string;
  providerJobId?: string;
};

const toTranscriptErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 900);
  }
  return "scene video transcript failed";
};

const readSceneVideoTranscript = (
  value: unknown,
): SceneVideoTranscript | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  try {
    return parseSceneVideoTranscript(value);
  } catch {
    return undefined;
  }
};

const matchesCurrentSceneVideo = (
  asset: Awaited<ReturnType<typeof getSceneAsset>>,
  s3Key: string,
): boolean => {
  return !!asset && asset.videoClipS3Key === s3Key;
};

const buildProcessingTranscript = (input: {
  sourceS3Key: string;
  providerJobId?: string;
  startedAt: string;
  updatedAt: string;
}): SceneVideoTranscript => ({
  status: "PROCESSING",
  provider: "AWS_TRANSCRIBE",
  sourceS3Key: input.sourceS3Key,
  providerJobId: input.providerJobId,
  startedAt: input.startedAt,
  updatedAt: input.updatedAt,
});

const buildFailedTranscript = (input: {
  sourceS3Key: string;
  providerJobId?: string;
  startedAt?: string;
  updatedAt: string;
  lastError: string;
}): SceneVideoTranscript => ({
  status: "FAILED",
  provider: "AWS_TRANSCRIBE",
  sourceS3Key: input.sourceS3Key,
  providerJobId: input.providerJobId,
  startedAt: input.startedAt,
  updatedAt: input.updatedAt,
  lastError: input.lastError,
});

const buildSucceededTranscript = (input: {
  sourceS3Key: string;
  providerJobId: string;
  languageCode?: string;
  startedAt?: string;
  completedAt: string;
  updatedAt: string;
  transcriptJsonS3Key: string;
  transcriptVttS3Key: string;
  transcriptSrtS3Key: string;
  plainTextPreview?: string;
}): SceneVideoTranscript => ({
  status: "SUCCEEDED",
  provider: "AWS_TRANSCRIBE",
  sourceS3Key: input.sourceS3Key,
  providerJobId: input.providerJobId,
  languageCode: input.languageCode,
  transcriptJsonS3Key: input.transcriptJsonS3Key,
  transcriptVttS3Key: input.transcriptVttS3Key,
  transcriptSrtS3Key: input.transcriptSrtS3Key,
  plainTextPreview: input.plainTextPreview,
  startedAt: input.startedAt,
  completedAt: input.completedAt,
  updatedAt: input.updatedAt,
});

const buildPreview = (text: string): string | undefined => {
  const preview = text.trim().slice(0, PREVIEW_MAX_LENGTH).trim();
  return preview.length > 0 ? preview : undefined;
};

const loadSceneVideoRunState = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  const sceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!matchesCurrentSceneVideo(sceneAsset, input.s3Key)) {
    return null;
  }

  const existingTranscript = readSceneVideoTranscript(
    sceneAsset?.videoTranscript,
  );
  if (
    existingTranscript?.sourceS3Key === input.s3Key &&
    existingTranscript.status === "SUCCEEDED"
  ) {
    return null;
  }

  const startedAt =
    existingTranscript?.sourceS3Key === input.s3Key &&
    existingTranscript.startedAt
      ? existingTranscript.startedAt
      : new Date().toISOString();

  const providerJobId =
    existingTranscript?.sourceS3Key === input.s3Key
      ? existingTranscript.providerJobId
      : undefined;

  return {
    startedAt,
    providerJobId,
  } satisfies SceneVideoTranscriptRunState;
};

const ensureProviderJobId = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
  providerJobId?: string;
}) => {
  if (input.providerJobId) {
    console.info(
      JSON.stringify({
        scope: "scene-video-transcript",
        action: "reused_job",
        jobId: input.jobId,
        sceneId: input.sceneId,
        s3Key: input.s3Key,
        providerJobId: input.providerJobId,
      }),
    );
    return input.providerJobId;
  }

  const startedJob = await startSceneVideoTranscriptionJob(input);
  console.info(
    JSON.stringify({
      scope: "scene-video-transcript",
      action: "started",
      jobId: input.jobId,
      sceneId: input.sceneId,
      s3Key: input.s3Key,
      providerJobId: startedJob.providerJobId,
    }),
  );
  return startedJob.providerJobId;
};

const saveProcessingTranscriptState = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
  providerJobId: string;
  startedAt: string;
}) => {
  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildProcessingTranscript({
      sourceS3Key: input.s3Key,
      providerJobId: input.providerJobId,
      startedAt: input.startedAt,
      updatedAt: new Date().toISOString(),
    }),
  });
};

const loadNormalizedTranscriptArtifacts = async (input: {
  providerJobId: string;
  s3Key: string;
}) => {
  const completedJob = await waitForSceneVideoTranscriptionJob({
    providerJobId: input.providerJobId,
  });
  const outputs = await loadSceneVideoTranscriptionOutputs({
    transcriptFileUri: completedJob.transcriptFileUri,
    subtitleFileUris: completedJob.subtitleFileUris,
  });
  const vttText =
    outputs.vttText && outputs.vttText.trim().length > 0
      ? outputs.vttText
      : buildVttFromSegments([]);
  const normalizedTranscript = normalizeSceneVideoTranscriptArtifact({
    provider: "AWS_TRANSCRIBE",
    providerJobId: input.providerJobId,
    sourceS3Key: input.s3Key,
    languageCode: completedJob.languageCode,
    providerTranscript: outputs.providerTranscript,
    vttText,
  });

  return {
    normalizedTranscript,
    finalVttText:
      outputs.vttText && outputs.vttText.trim().length > 0
        ? outputs.vttText
        : buildVttFromSegments(normalizedTranscript.segments),
    finalSrtText:
      outputs.srtText && outputs.srtText.trim().length > 0
        ? outputs.srtText
        : buildSrtFromSegments(normalizedTranscript.segments),
  };
};

const isCurrentSceneVideo = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  const currentSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  return matchesCurrentSceneVideo(currentSceneAsset, input.s3Key);
};

const persistSucceededTranscript = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
  providerJobId: string;
  startedAt: string;
  normalizedTranscript: ReturnType<
    typeof normalizeSceneVideoTranscriptArtifact
  >;
  vttText: string;
  srtText: string;
}) => {
  if (
    !(await isCurrentSceneVideo({
      jobId: input.jobId,
      sceneId: input.sceneId,
      s3Key: input.s3Key,
    }))
  ) {
    return;
  }

  const keys = await saveSceneVideoTranscriptArtifacts({
    jobId: input.jobId,
    sceneId: input.sceneId,
    providerJobId: input.providerJobId,
    normalizedTranscript: input.normalizedTranscript,
    vttText: input.vttText,
    srtText: input.srtText,
  });

  const completedAt = new Date().toISOString();
  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildSucceededTranscript({
      sourceS3Key: input.s3Key,
      providerJobId: input.providerJobId,
      languageCode: input.normalizedTranscript.languageCode,
      startedAt: input.startedAt,
      completedAt,
      updatedAt: completedAt,
      transcriptJsonS3Key: keys.jsonKey,
      transcriptVttS3Key: keys.vttKey,
      transcriptSrtS3Key: keys.srtKey,
      plainTextPreview: buildPreview(input.normalizedTranscript.text),
    }),
  });

  console.info(
    JSON.stringify({
      scope: "scene-video-transcript",
      action: "succeeded",
      jobId: input.jobId,
      sceneId: input.sceneId,
      s3Key: input.s3Key,
      providerJobId: input.providerJobId,
      transcriptJsonS3Key: keys.jsonKey,
    }),
  );
};

const persistFailedTranscript = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
  providerJobId?: string;
  startedAt: string;
  error: unknown;
}) => {
  if (
    !(await isCurrentSceneVideo({
      jobId: input.jobId,
      sceneId: input.sceneId,
      s3Key: input.s3Key,
    }))
  ) {
    return;
  }

  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildFailedTranscript({
      sourceS3Key: input.s3Key,
      providerJobId: input.providerJobId,
      startedAt: input.startedAt,
      updatedAt: new Date().toISOString(),
      lastError: toTranscriptErrorMessage(input.error),
    }),
  });

  console.error(
    JSON.stringify({
      scope: "scene-video-transcript",
      action: "failed",
      jobId: input.jobId,
      sceneId: input.sceneId,
      s3Key: input.s3Key,
      providerJobId: input.providerJobId,
      error: toTranscriptErrorMessage(input.error),
    }),
  );
};

export const processSceneVideoTranscript = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  const runState = await loadSceneVideoRunState(input);
  if (!runState) {
    return;
  }

  try {
    runState.providerJobId = await ensureProviderJobId({
      ...input,
      providerJobId: runState.providerJobId,
    });
    await saveProcessingTranscriptState({
      ...input,
      providerJobId: runState.providerJobId,
      startedAt: runState.startedAt,
    });
    const artifacts = await loadNormalizedTranscriptArtifacts({
      providerJobId: runState.providerJobId,
      s3Key: input.s3Key,
    });
    await persistSucceededTranscript({
      ...input,
      providerJobId: runState.providerJobId,
      startedAt: runState.startedAt,
      normalizedTranscript: artifacts.normalizedTranscript,
      vttText: artifacts.finalVttText,
      srtText: artifacts.finalSrtText,
    });
  } catch (error) {
    await persistFailedTranscript({
      ...input,
      providerJobId: runState.providerJobId,
      startedAt: runState.startedAt,
      error,
    });
    throw error;
  }
};
