import { getBufferFromS3 } from "../../../shared/lib/aws/runtime-s3";
import {
  parseSceneVideoTranscript,
  type SceneVideoTranscript,
} from "../../../shared/lib/contracts/video-transcript";
import { extractYoutubeTranscriptWithFargate } from "../../../shared/lib/providers/media/fargate";
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
type TranscriptProvider = SceneVideoTranscript["provider"];
type YoutubeTranscriptRunState = {
  startedAt: string;
  providerJobId?: string;
  failureProvider: TranscriptProvider;
  failureSourceS3Key?: string;
};

const toTranscriptErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 900);
  }
  return "youtube transcript extraction failed";
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

const matchesCurrentYoutubeSource = (
  asset: Awaited<ReturnType<typeof getSceneAsset>>,
  youtubeUrl: string,
): boolean => {
  const transcript = readSceneVideoTranscript(asset?.videoTranscript);
  return !!asset && transcript?.sourceUrl === youtubeUrl;
};

const buildPreview = (text: string): string | undefined => {
  const preview = text.trim().slice(0, PREVIEW_MAX_LENGTH).trim();
  return preview.length > 0 ? preview : undefined;
};

const buildProcessingTranscript = (input: {
  provider: TranscriptProvider;
  sourceUrl: string;
  sourceS3Key?: string;
  providerJobId?: string;
  startedAt: string;
  updatedAt: string;
}): SceneVideoTranscript => ({
  status: "PROCESSING",
  provider: input.provider,
  sourceUrl: input.sourceUrl,
  sourceS3Key: input.sourceS3Key,
  providerJobId: input.providerJobId,
  startedAt: input.startedAt,
  updatedAt: input.updatedAt,
});

const buildFailedTranscript = (input: {
  provider: TranscriptProvider;
  sourceUrl: string;
  sourceS3Key?: string;
  providerJobId?: string;
  startedAt?: string;
  updatedAt: string;
  lastError: string;
}): SceneVideoTranscript => ({
  status: "FAILED",
  provider: input.provider,
  sourceUrl: input.sourceUrl,
  sourceS3Key: input.sourceS3Key,
  providerJobId: input.providerJobId,
  startedAt: input.startedAt,
  updatedAt: input.updatedAt,
  lastError: input.lastError,
});

const buildSucceededTranscript = (input: {
  provider: TranscriptProvider;
  sourceUrl: string;
  sourceS3Key?: string;
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
  provider: input.provider,
  sourceUrl: input.sourceUrl,
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

const createRunState = (
  existingTranscript: SceneVideoTranscript | undefined,
  youtubeUrl: string,
): YoutubeTranscriptRunState => ({
  startedAt:
    existingTranscript?.sourceUrl === youtubeUrl && existingTranscript.startedAt
      ? existingTranscript.startedAt
      : new Date().toISOString(),
  providerJobId:
    existingTranscript?.sourceUrl === youtubeUrl
      ? existingTranscript.providerJobId
      : undefined,
  failureProvider: "YT_DLP",
  failureSourceS3Key:
    existingTranscript?.sourceUrl === youtubeUrl
      ? existingTranscript.sourceS3Key
      : undefined,
});

const loadYoutubeRunState = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
}) => {
  const sceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!matchesCurrentYoutubeSource(sceneAsset, input.youtubeUrl)) {
    return null;
  }
  const existingTranscript = readSceneVideoTranscript(
    sceneAsset?.videoTranscript,
  );
  if (
    existingTranscript?.sourceUrl === input.youtubeUrl &&
    existingTranscript.status === "SUCCEEDED"
  ) {
    return null;
  }
  return createRunState(existingTranscript, input.youtubeUrl);
};

const saveProcessingTranscriptState = async (input: {
  jobId: string;
  sceneId: number;
  provider: TranscriptProvider;
  sourceUrl: string;
  sourceS3Key?: string;
  providerJobId?: string;
  startedAt: string;
}) => {
  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildProcessingTranscript({
      provider: input.provider,
      sourceUrl: input.sourceUrl,
      sourceS3Key: input.sourceS3Key,
      providerJobId: input.providerJobId,
      startedAt: input.startedAt,
      updatedAt: new Date().toISOString(),
    }),
  });
};

const isCurrentYoutubeSource = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
}) => {
  const currentSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  return matchesCurrentYoutubeSource(currentSceneAsset, input.youtubeUrl);
};

const persistSucceededTranscript = async (input: {
  jobId: string;
  sceneId: number;
  provider: TranscriptProvider;
  sourceUrl: string;
  sourceS3Key?: string;
  startedAt: string;
  normalizedTranscript: ReturnType<
    typeof normalizeSceneVideoTranscriptArtifact
  >;
  vttText: string;
  srtText: string;
  successAction: string;
}) => {
  if (
    !(await isCurrentYoutubeSource({
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.sourceUrl,
    }))
  ) {
    return;
  }
  const keys = await saveSceneVideoTranscriptArtifacts({
    jobId: input.jobId,
    sceneId: input.sceneId,
    providerJobId: input.normalizedTranscript.providerJobId,
    normalizedTranscript: input.normalizedTranscript,
    vttText: input.vttText,
    srtText: input.srtText,
  });
  const completedAt = new Date().toISOString();
  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildSucceededTranscript({
      provider: input.provider,
      sourceUrl: input.sourceUrl,
      sourceS3Key: input.sourceS3Key,
      providerJobId: input.normalizedTranscript.providerJobId,
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
      action: input.successAction,
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.sourceUrl,
      providerJobId: input.normalizedTranscript.providerJobId,
      transcriptJsonS3Key: keys.jsonKey,
    }),
  );
};

const finalizeYoutubeSubtitleResult = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
  startedAt: string;
  providerJobId?: string;
  transcriptVttS3Key: string;
  languageCode?: string;
}) => {
  const vttObject = await getBufferFromS3(input.transcriptVttS3Key);
  if (!vttObject) {
    throw new Error("YouTube transcript VTT artifact not found");
  }
  const vttText = vttObject.buffer.toString("utf8");
  const normalizedTranscript = normalizeSceneVideoTranscriptArtifact({
    provider: "YT_DLP",
    providerJobId:
      input.providerJobId ??
      `youtube-${input.sceneId}-${Date.now().toString(36)}`,
    sourceUrl: input.youtubeUrl,
    languageCode: input.languageCode,
    providerTranscript: undefined,
    vttText,
  });
  await persistSucceededTranscript({
    jobId: input.jobId,
    sceneId: input.sceneId,
    provider: "YT_DLP",
    sourceUrl: input.youtubeUrl,
    startedAt: input.startedAt,
    normalizedTranscript,
    vttText,
    srtText: buildSrtFromSegments(normalizedTranscript.segments),
    successAction: "youtube_succeeded",
  });
};

const loadFallbackTranscriptionArtifacts = async (input: {
  providerJobId: string;
  audioS3Key: string;
  youtubeUrl: string;
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
    sourceS3Key: input.audioS3Key,
    sourceUrl: input.youtubeUrl,
    languageCode: completedJob.languageCode,
    providerTranscript: outputs.providerTranscript,
    vttText,
  });
  return {
    normalizedTranscript,
    vttText:
      outputs.vttText && outputs.vttText.trim().length > 0
        ? outputs.vttText
        : buildVttFromSegments(normalizedTranscript.segments),
    srtText:
      outputs.srtText && outputs.srtText.trim().length > 0
        ? outputs.srtText
        : buildSrtFromSegments(normalizedTranscript.segments),
  };
};

const runYoutubeTranscribeFallback = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
  audioS3Key: string;
  startedAt: string;
}) => {
  const transcribeStart = await startSceneVideoTranscriptionJob({
    jobId: input.jobId,
    sceneId: input.sceneId,
    s3Key: input.audioS3Key,
  });
  await saveProcessingTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    provider: "AWS_TRANSCRIBE",
    sourceUrl: input.youtubeUrl,
    sourceS3Key: input.audioS3Key,
    providerJobId: transcribeStart.providerJobId,
    startedAt: input.startedAt,
  });
  console.info(
    JSON.stringify({
      scope: "scene-video-transcript",
      action: "youtube_transcribe_fallback_started",
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.youtubeUrl,
      audioS3Key: input.audioS3Key,
      providerJobId: transcribeStart.providerJobId,
    }),
  );
  const artifacts = await loadFallbackTranscriptionArtifacts({
    providerJobId: transcribeStart.providerJobId,
    audioS3Key: input.audioS3Key,
    youtubeUrl: input.youtubeUrl,
  });
  await persistSucceededTranscript({
    jobId: input.jobId,
    sceneId: input.sceneId,
    provider: "AWS_TRANSCRIBE",
    sourceUrl: input.youtubeUrl,
    sourceS3Key: input.audioS3Key,
    startedAt: input.startedAt,
    normalizedTranscript: artifacts.normalizedTranscript,
    vttText: artifacts.vttText,
    srtText: artifacts.srtText,
    successAction: "youtube_transcribe_fallback_succeeded",
  });
  return transcribeStart.providerJobId;
};

const saveYoutubeTranscriptFailure = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
  runState: YoutubeTranscriptRunState;
  error: unknown;
}) => {
  const currentSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!matchesCurrentYoutubeSource(currentSceneAsset, input.youtubeUrl)) {
    return;
  }
  await saveSceneVideoTranscriptState({
    jobId: input.jobId,
    sceneId: input.sceneId,
    transcript: buildFailedTranscript({
      provider: input.runState.failureProvider,
      sourceUrl: input.youtubeUrl,
      sourceS3Key: input.runState.failureSourceS3Key,
      providerJobId: input.runState.providerJobId,
      startedAt: input.runState.startedAt,
      updatedAt: new Date().toISOString(),
      lastError: toTranscriptErrorMessage(input.error),
    }),
  });
  console.error(
    JSON.stringify({
      scope: "scene-video-transcript",
      action: "youtube_failed",
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.youtubeUrl,
      providerJobId: input.runState.providerJobId,
      error: toTranscriptErrorMessage(input.error),
    }),
  );
};

export const processYoutubeSceneVideoTranscript = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
  preferredLanguage?: string;
}) => {
  const runState = await loadYoutubeRunState(input);
  if (!runState) {
    return;
  }

  try {
    await saveProcessingTranscriptState({
      jobId: input.jobId,
      sceneId: input.sceneId,
      provider: "YT_DLP",
      sourceUrl: input.youtubeUrl,
      providerJobId: runState.providerJobId,
      startedAt: runState.startedAt,
    });
    const extracted = await extractYoutubeTranscriptWithFargate({
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.youtubeUrl,
      preferredLanguage: input.preferredLanguage,
    });
    runState.providerJobId = extracted.providerJobId ?? runState.providerJobId;

    if (extracted.transcriptVttS3Key) {
      await finalizeYoutubeSubtitleResult({
        jobId: input.jobId,
        sceneId: input.sceneId,
        youtubeUrl: input.youtubeUrl,
        startedAt: runState.startedAt,
        providerJobId: runState.providerJobId,
        transcriptVttS3Key: extracted.transcriptVttS3Key,
        languageCode: extracted.languageCode,
      });
      return;
    }
    if (!extracted.audioS3Key) {
      throw new Error(
        "YouTube transcript task completed without subtitles or audio fallback output",
      );
    }

    runState.failureProvider = "AWS_TRANSCRIBE";
    runState.failureSourceS3Key = extracted.audioS3Key;
    runState.providerJobId = await runYoutubeTranscribeFallback({
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.youtubeUrl,
      audioS3Key: extracted.audioS3Key,
      startedAt: runState.startedAt,
    });
  } catch (error) {
    await saveYoutubeTranscriptFailure({
      jobId: input.jobId,
      sceneId: input.sceneId,
      youtubeUrl: input.youtubeUrl,
      runState,
      error,
    });
    throw error;
  }
};
