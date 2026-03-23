import assert from "node:assert/strict";
import test from "node:test";

import { resolveTargetVideoDurationSec } from "../services/admin/graphql/run-asset-generation/usecase/run-asset-generation";
import { resolveRequestedBytePlusDurationSec } from "../services/shared/lib/providers/media/byteplus-video";
import { generateSceneVideos } from "../services/video-generation/usecase/generate-scene-videos";

void test("scene video target duration prefers longer voice length", () => {
  const durationSec = resolveTargetVideoDurationSec({
    scene: {
      sceneId: 3,
      durationSec: 6,
      narration: "narration",
      imagePrompt: "image",
      subtitle: "subtitle",
    },
    voiceDurationSec: 8.4,
  });

  assert.equal(durationSec, 8.4);
});

void test("byteplus duration rounds up to supported duration", () => {
  const resolvedDurationSec = resolveRequestedBytePlusDurationSec({
    secret: {
      apiKey: "test",
      supportedDurations: [5, 8, 10],
    },
    targetDurationSec: 6.1,
  });

  assert.equal(resolvedDurationSec, 8);
});

void test("scene video generation forwards target duration", async () => {
  const received: Array<Record<string, unknown>> = [];

  const videoAssets = await generateSceneVideos(
    {
      jobId: "job_test",
      secretId: "secret",
      scenes: [
        {
          sceneId: 1,
          videoPrompt: "slow cinematic pan",
          targetDurationSec: 7.2,
        },
      ],
    },
    {
      generateSceneVideo: async (input) => {
        received.push(input as Record<string, unknown>);
        return {
          sceneId: input.sceneId,
          videoClipS3Key: `assets/${input.jobId}/videos/scene-${input.sceneId}.mp4`,
        };
      },
    },
  );

  assert.equal(videoAssets.length, 1);
  assert.equal(received[0]?.targetDurationSec, 7.2);
});
