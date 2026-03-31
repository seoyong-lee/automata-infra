import type { StandaloneVideoTranscript } from "../../../shared/lib/contracts/standalone-video-transcript";
import {
  getStandaloneVideoTranscript,
  putStandaloneVideoTranscript,
} from "../../../shared/lib/store/standalone-video-transcripts";
import {
  buildVttFromSegments,
  buildMarkdownFromTranscript,
  normalizeSceneVideoTranscriptArtifact,
} from "../../scene-video/mapper/normalize-scene-video-transcript";
import {
  loadSceneVideoTranscriptionOutputs,
  startStandaloneVideoTranscriptionJob,
  waitForSceneVideoTranscriptionJob,
} from "../../scene-video/repo/aws-transcribe-scene-video";

const PREVIEW_MAX_LENGTH = 400;

const toTranscriptErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 900);
  }
  return "video transcript failed";
};

const buildPreview = (text: string): string | undefined => {
  const preview = text.trim().slice(0, PREVIEW_MAX_LENGTH).trim();
  return preview.length > 0 ? preview : undefined;
};

const matchesCurrentUploadTranscript = (
  transcript: StandaloneVideoTranscript | null,
  s3Key: string,
): boolean => {
  return (
    !!transcript &&
    transcript.sourceType === "UPLOAD" &&
    transcript.sourceS3Key === s3Key
  );
};

const loadRunState = async (input: { transcriptId: string; s3Key: string }) => {
  const transcript = await getStandaloneVideoTranscript(input.transcriptId);
  if (!transcript || !matchesCurrentUploadTranscript(transcript, input.s3Key)) {
    return null;
  }
  if (transcript.status === "SUCCEEDED") {
    return null;
  }
  return {
    transcript,
    startedAt: transcript.startedAt ?? new Date().toISOString(),
  };
};

const loadNormalizedTranscript = async (input: {
  providerJobId: string;
  s3Key: string;
  preferredLanguage?: string;
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
  return normalizeSceneVideoTranscriptArtifact({
    provider: "AWS_TRANSCRIBE",
    providerJobId: input.providerJobId,
    sourceS3Key: input.s3Key,
    languageCode: completedJob.languageCode ?? input.preferredLanguage,
    providerTranscript: outputs.providerTranscript,
    vttText,
  });
};

const ensureProviderJobId = async (input: {
  transcriptId: string;
  s3Key: string;
  providerJobId?: string;
}) => {
  if (input.providerJobId) {
    return input.providerJobId;
  }
  const started = await startStandaloneVideoTranscriptionJob({
    transcriptId: input.transcriptId,
    s3Key: input.s3Key,
  });
  return started.providerJobId;
};

const saveProcessingTranscriptState = async (input: {
  transcript: StandaloneVideoTranscript;
  s3Key: string;
  preferredLanguage?: string;
  providerJobId: string;
  startedAt: string;
}) => {
  await putStandaloneVideoTranscript({
    ...input.transcript,
    status: "PROCESSING",
    provider: "AWS_TRANSCRIBE",
    sourceType: "UPLOAD",
    sourceS3Key: input.s3Key,
    languageCode: input.preferredLanguage ?? input.transcript.languageCode,
    providerJobId: input.providerJobId,
    markdown: undefined,
    plainTextPreview: undefined,
    startedAt: input.startedAt,
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
    lastError: undefined,
  });
};

const loadCurrentUploadTranscript = async (input: {
  transcriptId: string;
  s3Key: string;
}) => {
  const transcript = await getStandaloneVideoTranscript(input.transcriptId);
  if (!transcript || !matchesCurrentUploadTranscript(transcript, input.s3Key)) {
    return null;
  }
  return transcript;
};

const persistSucceededTranscript = async (input: {
  transcriptId: string;
  s3Key: string;
  preferredLanguage?: string;
  providerJobId: string;
  startedAt: string;
  normalizedTranscript: ReturnType<
    typeof normalizeSceneVideoTranscriptArtifact
  >;
}) => {
  const currentTranscript = await loadCurrentUploadTranscript({
    transcriptId: input.transcriptId,
    s3Key: input.s3Key,
  });
  if (!currentTranscript) {
    return;
  }

  const completedAt = new Date().toISOString();
  await putStandaloneVideoTranscript({
    ...currentTranscript,
    status: "SUCCEEDED",
    provider: "AWS_TRANSCRIBE",
    sourceType: "UPLOAD",
    sourceS3Key: input.s3Key,
    languageCode:
      input.normalizedTranscript.languageCode ??
      input.preferredLanguage ??
      currentTranscript.languageCode,
    providerJobId: input.providerJobId,
    markdown: buildMarkdownFromTranscript(input.normalizedTranscript),
    plainTextPreview: buildPreview(input.normalizedTranscript.text),
    startedAt: input.startedAt,
    completedAt,
    updatedAt: completedAt,
  });
};

const persistFailedTranscript = async (input: {
  transcriptId: string;
  s3Key: string;
  preferredLanguage?: string;
  providerJobId?: string;
  startedAt: string;
  error: unknown;
}) => {
  const currentTranscript = await loadCurrentUploadTranscript({
    transcriptId: input.transcriptId,
    s3Key: input.s3Key,
  });
  if (!currentTranscript) {
    return;
  }

  await putStandaloneVideoTranscript({
    ...currentTranscript,
    status: "FAILED",
    provider: "AWS_TRANSCRIBE",
    sourceType: "UPLOAD",
    sourceS3Key: input.s3Key,
    languageCode: input.preferredLanguage ?? currentTranscript.languageCode,
    providerJobId: input.providerJobId,
    markdown: undefined,
    plainTextPreview: undefined,
    startedAt: input.startedAt,
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
    lastError: toTranscriptErrorMessage(input.error),
  });
};

export const processUploadVideoTranscript = async (input: {
  transcriptId: string;
  s3Key: string;
  preferredLanguage?: string;
}) => {
  const runState = await loadRunState(input);
  if (!runState) {
    return;
  }

  let providerJobId = runState.transcript.providerJobId;

  try {
    providerJobId = await ensureProviderJobId({
      transcriptId: input.transcriptId,
      s3Key: input.s3Key,
      providerJobId,
    });
    await saveProcessingTranscriptState({
      transcript: runState.transcript,
      s3Key: input.s3Key,
      preferredLanguage: input.preferredLanguage,
      providerJobId,
      startedAt: runState.startedAt,
    });

    const normalizedTranscript = await loadNormalizedTranscript({
      providerJobId,
      s3Key: input.s3Key,
      preferredLanguage:
        input.preferredLanguage ?? runState.transcript.languageCode,
    });
    await persistSucceededTranscript({
      transcriptId: input.transcriptId,
      s3Key: input.s3Key,
      preferredLanguage: input.preferredLanguage,
      providerJobId,
      startedAt: runState.startedAt,
      normalizedTranscript,
    });
  } catch (error) {
    await persistFailedTranscript({
      transcriptId: input.transcriptId,
      s3Key: input.s3Key,
      preferredLanguage: input.preferredLanguage,
      providerJobId,
      startedAt: runState.startedAt,
      error,
    });
    throw error;
  }
};
