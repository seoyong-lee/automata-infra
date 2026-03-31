import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarkdownFromTranscript,
  buildSrtFromSegments,
  buildVttFromSegments,
  normalizeSceneVideoTranscriptArtifact,
  parseVttSegments,
} from "../services/transcript/scene-video/mapper/normalize-scene-video-transcript";
import {
  parseCompleteSceneVideoUploadInput,
  parseExtractYoutubeTranscriptInput,
  parseSceneVideoTranscriptWorkerEvent,
} from "../services/shared/lib/contracts/video-transcript";
import {
  parseCreateVideoTranscriptFromUploadInput,
  parseCreateVideoTranscriptFromYoutubeInput,
  parseGetTranscriptInput,
  parseRequestTranscriptUploadInput,
  parseStandaloneVideoTranscriptWorkerEvent,
} from "../services/shared/lib/contracts/standalone-video-transcript";
import { buildStandaloneTranscriptUploadSourceKey } from "../services/shared/lib/store/standalone-video-transcripts";

void test("scene video transcript helpers round-trip subtitle segments", () => {
  const segments = [
    {
      startSec: 0,
      endSec: 1.25,
      text: "Hello world.",
    },
    {
      startSec: 2,
      endSec: 4.5,
      text: "Second caption line.",
    },
  ];

  const vtt = buildVttFromSegments(segments);
  const srt = buildSrtFromSegments(segments);

  assert.match(vtt, /WEBVTT/);
  assert.match(srt, /1\n00:00:00,000 --> 00:00:01,250/);
  assert.deepEqual(parseVttSegments(vtt), segments);
});

void test("scene video transcript normalization keeps provider text and timing", () => {
  const normalized = normalizeSceneVideoTranscriptArtifact({
    provider: "AWS_TRANSCRIBE",
    providerJobId: "scene-video-1-testjob",
    sourceS3Key: "assets/job_123/manual/video/scene-1/clip.mp4",
    languageCode: "en-US",
    providerTranscript: {
      results: {
        transcripts: [
          {
            transcript: "Hello world. Second caption line.",
          },
        ],
      },
    },
    vttText: `WEBVTT

00:00:00.000 --> 00:00:01.250
Hello world.

00:00:02.000 --> 00:00:04.500
Second caption line.
`,
  });

  assert.equal(normalized.provider, "AWS_TRANSCRIBE");
  assert.equal(normalized.languageCode, "en-US");
  assert.equal(normalized.text, "Hello world. Second caption line.");
  assert.equal(normalized.segments.length, 2);
  assert.equal(normalized.segments[1]?.text, "Second caption line.");
});

void test("youtube transcript normalization supports url sources", () => {
  const normalized = normalizeSceneVideoTranscriptArtifact({
    provider: "YT_DLP",
    providerJobId: "task-arn-123",
    sourceUrl: "https://www.youtube.com/watch?v=abc123xyz00",
    languageCode: "ko",
    providerTranscript: undefined,
    vttText: `WEBVTT

00:00:00.000 --> 00:00:01.250
안녕하세요.
`,
  });

  assert.equal(normalized.provider, "YT_DLP");
  assert.equal(
    normalized.sourceUrl,
    "https://www.youtube.com/watch?v=abc123xyz00",
  );
  assert.equal(normalized.text, "안녕하세요.");
});

void test("standalone markdown transcript includes metadata and text", () => {
  const normalized = normalizeSceneVideoTranscriptArtifact({
    provider: "YT_DLP",
    providerJobId: "task-arn-123",
    sourceUrl: "https://www.youtube.com/watch?v=abc123xyz00",
    languageCode: "ko",
    providerTranscript: undefined,
    vttText: `WEBVTT

00:00:00.000 --> 00:00:01.250
안녕하세요.
`,
  });

  const markdown = buildMarkdownFromTranscript(normalized);
  assert.match(markdown, /# Transcript/);
  assert.match(markdown, /## Text/);
  assert.match(markdown, /안녕하세요\./);
  assert.match(markdown, /## Segments/);
});

void test("scene video upload contract requires job, scene, and s3 key", () => {
  const parsed = parseCompleteSceneVideoUploadInput({
    jobId: "job_123",
    sceneId: 2,
    s3Key: "assets/job_123/manual/video/scene-2/clip.mp4",
  });

  assert.equal(parsed.jobId, "job_123");
  assert.equal(parsed.sceneId, 2);
  assert.equal(parsed.s3Key, "assets/job_123/manual/video/scene-2/clip.mp4");
});

void test("youtube transcript contract accepts video url input", () => {
  const parsed = parseExtractYoutubeTranscriptInput({
    jobId: "job_123",
    sceneId: 3,
    youtubeUrl: "https://www.youtube.com/watch?v=abc123xyz00",
  });

  assert.equal(parsed.jobId, "job_123");
  assert.equal(parsed.sceneId, 3);
  assert.equal(
    parsed.youtubeUrl,
    "https://www.youtube.com/watch?v=abc123xyz00",
  );
});

void test("scene transcript worker parses youtube events", () => {
  const parsed = parseSceneVideoTranscriptWorkerEvent({
    kind: "YOUTUBE_URL",
    jobId: "job_123",
    sceneId: 4,
    youtubeUrl: "https://www.youtube.com/watch?v=abc123xyz00",
    preferredLanguage: "ko",
  });

  assert.equal(parsed.kind, "YOUTUBE_URL");
  assert.equal(parsed.preferredLanguage, "ko");
});

void test("standalone transcript upload contract parses input", () => {
  const parsed = parseRequestTranscriptUploadInput({
    fileName: "clip.mp4",
    contentType: "video/mp4",
  });

  assert.equal(parsed.fileName, "clip.mp4");
  assert.equal(parsed.contentType, "video/mp4");
});

void test("standalone upload transcript request parses input", () => {
  const parsed = parseCreateVideoTranscriptFromUploadInput({
    transcriptId: "transcript_123",
    s3Key: "assets/transcripts/transcript_123/source/1-clip.mp4",
    languageCode: "ko",
  });

  assert.equal(parsed.transcriptId, "transcript_123");
  assert.equal(parsed.languageCode, "ko");
});

void test("standalone youtube transcript request parses input", () => {
  const parsed = parseCreateVideoTranscriptFromYoutubeInput({
    youtubeUrl: "https://www.youtube.com/watch?v=abc123xyz00",
    languageCode: "en",
  });

  assert.equal(
    parsed.youtubeUrl,
    "https://www.youtube.com/watch?v=abc123xyz00",
  );
  assert.equal(parsed.languageCode, "en");
});

void test("standalone get transcript args parse transcript id", () => {
  const parsed = parseGetTranscriptInput({
    transcriptId: "transcript_123",
  });

  assert.equal(parsed.transcriptId, "transcript_123");
});

void test("standalone worker parses upload events", () => {
  const parsed = parseStandaloneVideoTranscriptWorkerEvent({
    kind: "UPLOAD_S3",
    transcriptId: "transcript_123",
    s3Key: "assets/transcripts/transcript_123/source/1-clip.mp4",
    preferredLanguage: "ko",
  });

  assert.equal(parsed.kind, "UPLOAD_S3");
  assert.equal(parsed.preferredLanguage, "ko");
});

void test("standalone upload source key uses transcript prefix", () => {
  const key = buildStandaloneTranscriptUploadSourceKey({
    transcriptId: "transcript_abc",
    fileName: "my clip.mp4",
  });

  assert.match(key, /^assets\/transcripts\/transcript_abc\/source\//);
  assert.match(key, /my-clip\.mp4$/);
});
