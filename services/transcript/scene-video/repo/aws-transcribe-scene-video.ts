import { createHash } from "crypto";

import {
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import { getAssetsBucketName } from "../../../shared/lib/aws/runtime-env";

const client = new TranscribeClient({});
const POLL_INTERVAL_MS = 10000;
const MAX_WAIT_MS = 13 * 60 * 1000;

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const sanitizeJobNamePart = (value: string): string => {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
};

const buildJobName = (input: {
  scope: string;
  identity: string;
  s3Key: string;
}): string => {
  const digest = createHash("sha1")
    .update(`${input.scope}:${input.identity}:${input.s3Key}`)
    .digest("hex")
    .slice(0, 16);
  return `${input.scope}-${sanitizeJobNamePart(input.identity).slice(0, 24)}-${digest}`;
};

const resolveMediaFormat = (
  s3Key: string,
): "mp4" | "webm" | "m4a" | "mp3" | "wav" | "flac" | "ogg" => {
  const normalized = s3Key.toLowerCase();
  if (normalized.endsWith(".webm")) {
    return "webm";
  }
  if (normalized.endsWith(".m4a")) {
    return "m4a";
  }
  if (normalized.endsWith(".mp3")) {
    return "mp3";
  }
  if (normalized.endsWith(".wav")) {
    return "wav";
  }
  if (normalized.endsWith(".flac")) {
    return "flac";
  }
  if (normalized.endsWith(".ogg")) {
    return "ogg";
  }
  return "mp4";
};

const fetchText = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`failed to fetch transcript artifact: ${response.status}`);
  }
  return response.text();
};

const fetchJson = async <T>(uri: string): Promise<T> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`failed to fetch transcript json: ${response.status}`);
  }
  return (await response.json()) as T;
};

const startVideoTranscriptionJob = async (input: {
  scope: "scene-video" | "transcript";
  identity: string;
  s3Key: string;
}): Promise<{ providerJobId: string }> => {
  const providerJobId = buildJobName({
    scope: input.scope,
    identity: input.identity,
    s3Key: input.s3Key,
  });
  try {
    await client.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: providerJobId,
        IdentifyLanguage: true,
        MediaFormat: resolveMediaFormat(input.s3Key),
        Media: {
          MediaFileUri: `s3://${getAssetsBucketName()}/${input.s3Key}`,
        },
        Subtitles: {
          Formats: ["vtt", "srt"],
          OutputStartIndex: 1,
        },
      }),
    );
  } catch (error) {
    const conflict =
      !!error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ConflictException";
    if (!conflict) {
      throw error;
    }
  }
  return { providerJobId };
};

export const startSceneVideoTranscriptionJob = async (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}): Promise<{ providerJobId: string }> => {
  return startVideoTranscriptionJob({
    scope: "scene-video",
    identity: `${input.jobId}:${input.sceneId}`,
    s3Key: input.s3Key,
  });
};

export const startStandaloneVideoTranscriptionJob = async (input: {
  transcriptId: string;
  s3Key: string;
}): Promise<{ providerJobId: string }> => {
  return startVideoTranscriptionJob({
    scope: "transcript",
    identity: input.transcriptId,
    s3Key: input.s3Key,
  });
};

export const waitForSceneVideoTranscriptionJob = async (input: {
  providerJobId: string;
}): Promise<{
  providerJobId: string;
  languageCode?: string;
  transcriptFileUri: string;
  subtitleFileUris: string[];
}> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    const result = await client.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: input.providerJobId,
      }),
    );
    const job = result.TranscriptionJob;
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    const status = job?.TranscriptionJobStatus;

    if (status === "COMPLETED") {
      const transcriptFileUri = job.Transcript?.TranscriptFileUri;
      if (!transcriptFileUri) {
        throw new Error("transcription completed without transcript output");
      }
      return {
        providerJobId: input.providerJobId,
        languageCode: job.LanguageCode,
        transcriptFileUri,
        subtitleFileUris: job.Subtitles?.SubtitleFileUris ?? [],
      };
    }

    if (status === "FAILED") {
      throw new Error(
        job.FailureReason?.trim() || "scene video transcription failed",
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("scene video transcription timed out");
};

export const loadSceneVideoTranscriptionOutputs = async (input: {
  transcriptFileUri: string;
  subtitleFileUris: string[];
}): Promise<{
  providerTranscript: unknown;
  vttText?: string;
  srtText?: string;
}> => {
  const providerTranscript = await fetchJson(input.transcriptFileUri);
  let vttText: string | undefined;
  let srtText: string | undefined;

  for (const uri of input.subtitleFileUris) {
    const normalized = uri.toLowerCase();
    if (!vttText && normalized.endsWith(".vtt")) {
      vttText = await fetchText(uri);
      continue;
    }
    if (!srtText && normalized.endsWith(".srt")) {
      srtText = await fetchText(uri);
    }
  }

  return {
    providerTranscript,
    vttText,
    srtText,
  };
};
