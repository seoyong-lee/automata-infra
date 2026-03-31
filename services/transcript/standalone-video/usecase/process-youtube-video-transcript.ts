import { getBufferFromS3 } from "../../../shared/lib/aws/runtime-s3";
import type { StandaloneVideoTranscript } from "../../../shared/lib/contracts/standalone-video-transcript";
import { extractStandaloneYoutubeTranscriptWithFargate } from "../../../shared/lib/providers/media/fargate";
import {
  getStandaloneVideoTranscript,
  putStandaloneVideoTranscript,
} from "../../../shared/lib/store/standalone-video-transcripts";
import {
  buildMarkdownFromTranscript,
  buildSrtFromSegments,
  buildVttFromSegments,
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
  return "youtube transcript extraction failed";
};

const buildPreview = (text: string): string | undefined => {
  const preview = text.trim().slice(0, PREVIEW_MAX_LENGTH).trim();
  return preview.length > 0 ? preview : undefined;
};

const matchesCurrentYoutubeTranscript = (
  transcript: StandaloneVideoTranscript | null,
  youtubeUrl: string,
): boolean => {
  return (
    !!transcript &&
    transcript.sourceType === "YOUTUBE_URL" &&
    transcript.sourceUrl === youtubeUrl
  );
};

const loadRunState = async (input: {
  transcriptId: string;
  youtubeUrl: string;
}) => {
  const transcript = await getStandaloneVideoTranscript(input.transcriptId);
  if (
    !transcript ||
    !matchesCurrentYoutubeTranscript(transcript, input.youtubeUrl)
  ) {
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

const finalizeYoutubeSubtitleResult = async (input: {
  transcriptId: string;
  youtubeUrl: string;
  transcriptVttS3Key: string;
  providerJobId?: string;
  preferredLanguage?: string;
  startedAt: string;
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
      `youtube-${input.transcriptId}-${Date.now().toString(36)}`,
    sourceUrl: input.youtubeUrl,
    languageCode: input.preferredLanguage,
    providerTranscript: undefined,
    vttText,
  });
  const currentTranscript = await getStandaloneVideoTranscript(
    input.transcriptId,
  );
  if (
    !currentTranscript ||
    !matchesCurrentYoutubeTranscript(currentTranscript, input.youtubeUrl)
  ) {
    return;
  }

  const completedAt = new Date().toISOString();
  await putStandaloneVideoTranscript({
    ...currentTranscript,
    status: "SUCCEEDED",
    provider: "YT_DLP",
    sourceType: "YOUTUBE_URL",
    sourceUrl: input.youtubeUrl,
    languageCode:
      normalizedTranscript.languageCode ??
      input.preferredLanguage ??
      currentTranscript.languageCode,
    providerJobId: normalizedTranscript.providerJobId,
    markdown: buildMarkdownFromTranscript(normalizedTranscript),
    plainTextPreview: buildPreview(normalizedTranscript.text),
    startedAt: input.startedAt,
    completedAt,
    updatedAt: completedAt,
  });
};

const loadFallbackTranscriptionArtifacts = async (input: {
  providerJobId: string;
  audioS3Key: string;
  youtubeUrl: string;
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
  const normalizedTranscript = normalizeSceneVideoTranscriptArtifact({
    provider: "AWS_TRANSCRIBE",
    providerJobId: input.providerJobId,
    sourceS3Key: input.audioS3Key,
    sourceUrl: input.youtubeUrl,
    languageCode: completedJob.languageCode ?? input.preferredLanguage,
    providerTranscript: outputs.providerTranscript,
    vttText,
  });
  return {
    normalizedTranscript,
    srtText:
      outputs.srtText && outputs.srtText.trim().length > 0
        ? outputs.srtText
        : buildSrtFromSegments(normalizedTranscript.segments),
  };
};

const saveYoutubeProcessingTranscriptState = async (input: {
  transcript: StandaloneVideoTranscript;
  provider: StandaloneVideoTranscript["provider"];
  youtubeUrl: string;
  preferredLanguage?: string;
  providerJobId?: string;
  sourceS3Key?: string;
  startedAt: string;
}) => {
  await putStandaloneVideoTranscript({
    ...input.transcript,
    status: "PROCESSING",
    provider: input.provider,
    sourceType: "YOUTUBE_URL",
    sourceUrl: input.youtubeUrl,
    sourceS3Key: input.sourceS3Key,
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

const loadCurrentYoutubeTranscript = async (input: {
  transcriptId: string;
  youtubeUrl: string;
}) => {
  const transcript = await getStandaloneVideoTranscript(input.transcriptId);
  if (
    !transcript ||
    !matchesCurrentYoutubeTranscript(transcript, input.youtubeUrl)
  ) {
    return null;
  }
  return transcript;
};

const persistSucceededFallbackTranscript = async (input: {
  transcriptId: string;
  youtubeUrl: string;
  audioS3Key: string;
  preferredLanguage?: string;
  providerJobId: string;
  startedAt: string;
  normalizedTranscript: ReturnType<
    typeof normalizeSceneVideoTranscriptArtifact
  >;
}) => {
  const currentTranscript = await loadCurrentYoutubeTranscript({
    transcriptId: input.transcriptId,
    youtubeUrl: input.youtubeUrl,
  });
  if (!currentTranscript) {
    return;
  }

  const completedAt = new Date().toISOString();
  await putStandaloneVideoTranscript({
    ...currentTranscript,
    status: "SUCCEEDED",
    provider: "AWS_TRANSCRIBE",
    sourceType: "YOUTUBE_URL",
    sourceUrl: input.youtubeUrl,
    sourceS3Key: input.audioS3Key,
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

const persistFailedYoutubeTranscript = async (input: {
  transcriptId: string;
  youtubeUrl: string;
  preferredLanguage?: string;
  providerJobId?: string;
  failureProvider: StandaloneVideoTranscript["provider"];
  failureSourceS3Key?: string;
  startedAt: string;
  error: unknown;
}) => {
  const currentTranscript = await loadCurrentYoutubeTranscript({
    transcriptId: input.transcriptId,
    youtubeUrl: input.youtubeUrl,
  });
  if (!currentTranscript) {
    return;
  }

  await putStandaloneVideoTranscript({
    ...currentTranscript,
    status: "FAILED",
    provider: input.failureProvider,
    sourceType: "YOUTUBE_URL",
    sourceUrl: input.youtubeUrl,
    sourceS3Key: input.failureSourceS3Key,
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

const runYoutubeAudioFallback = async (input: {
  transcript: StandaloneVideoTranscript;
  transcriptId: string;
  youtubeUrl: string;
  audioS3Key: string;
  preferredLanguage?: string;
  startedAt: string;
}) => {
  const transcribeStart = await startStandaloneVideoTranscriptionJob({
    transcriptId: input.transcriptId,
    s3Key: input.audioS3Key,
  });
  await saveYoutubeProcessingTranscriptState({
    transcript: input.transcript,
    provider: "AWS_TRANSCRIBE",
    youtubeUrl: input.youtubeUrl,
    preferredLanguage: input.preferredLanguage,
    providerJobId: transcribeStart.providerJobId,
    sourceS3Key: input.audioS3Key,
    startedAt: input.startedAt,
  });
  const artifacts = await loadFallbackTranscriptionArtifacts({
    providerJobId: transcribeStart.providerJobId,
    audioS3Key: input.audioS3Key,
    youtubeUrl: input.youtubeUrl,
    preferredLanguage: input.preferredLanguage,
  });
  await persistSucceededFallbackTranscript({
    transcriptId: input.transcriptId,
    youtubeUrl: input.youtubeUrl,
    audioS3Key: input.audioS3Key,
    preferredLanguage: input.preferredLanguage,
    providerJobId: transcribeStart.providerJobId,
    startedAt: input.startedAt,
    normalizedTranscript: artifacts.normalizedTranscript,
  });
  void artifacts.srtText;
  return transcribeStart.providerJobId;
};

const handleYoutubeExtractionResult = async (input: {
  transcript: StandaloneVideoTranscript;
  transcriptId: string;
  youtubeUrl: string;
  preferredLanguage?: string;
  startedAt: string;
  extracted: Awaited<
    ReturnType<typeof extractStandaloneYoutubeTranscriptWithFargate>
  >;
  providerJobId?: string;
}) => {
  const providerJobId = input.extracted.providerJobId ?? input.providerJobId;
  if (input.extracted.transcriptVttS3Key) {
    await finalizeYoutubeSubtitleResult({
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      transcriptVttS3Key: input.extracted.transcriptVttS3Key,
      providerJobId,
      preferredLanguage:
        input.extracted.languageCode ?? input.preferredLanguage,
      startedAt: input.startedAt,
    });
    return {
      providerJobId,
      failureProvider: "YT_DLP" as const,
      failureSourceS3Key: undefined,
    };
  }
  if (!input.extracted.audioS3Key) {
    throw new Error(
      "YouTube transcript task completed without subtitles or audio fallback output",
    );
  }

  return {
    providerJobId: await runYoutubeAudioFallback({
      transcript: input.transcript,
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      audioS3Key: input.extracted.audioS3Key,
      preferredLanguage: input.preferredLanguage,
      startedAt: input.startedAt,
    }),
    failureProvider: "AWS_TRANSCRIBE" as const,
    failureSourceS3Key: input.extracted.audioS3Key,
  };
};

export const processYoutubeVideoTranscript = async (input: {
  transcriptId: string;
  youtubeUrl: string;
  preferredLanguage?: string;
}) => {
  const runState = await loadRunState(input);
  if (!runState) {
    return;
  }
  let providerJobId = runState.transcript.providerJobId;
  let failureProvider: StandaloneVideoTranscript["provider"] = "YT_DLP";
  let failureSourceS3Key: string | undefined;
  try {
    await saveYoutubeProcessingTranscriptState({
      transcript: runState.transcript,
      provider: "YT_DLP",
      youtubeUrl: input.youtubeUrl,
      preferredLanguage:
        input.preferredLanguage ?? runState.transcript.languageCode,
      providerJobId,
      startedAt: runState.startedAt,
    });

    const extracted = await extractStandaloneYoutubeTranscriptWithFargate({
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      preferredLanguage:
        input.preferredLanguage ?? runState.transcript.languageCode,
    });
    const nextState = await handleYoutubeExtractionResult({
      transcript: runState.transcript,
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      preferredLanguage:
        input.preferredLanguage ?? runState.transcript.languageCode,
      startedAt: runState.startedAt,
      extracted,
      providerJobId,
    });
    providerJobId = nextState.providerJobId;
    failureProvider = nextState.failureProvider;
    failureSourceS3Key = nextState.failureSourceS3Key;
  } catch (error) {
    await persistFailedYoutubeTranscript({
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      preferredLanguage: input.preferredLanguage,
      providerJobId,
      failureProvider,
      failureSourceS3Key,
      startedAt: runState.startedAt,
      error,
    });
    throw error;
  }
};
