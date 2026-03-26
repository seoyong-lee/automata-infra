import assert from "node:assert/strict";
import test from "node:test";

import { parseUpdateSceneJsonArgs } from "../services/admin/generations/update-scene-json/normalize/parse-update-scene-json-args";
import { collectAssetRefs } from "../services/composition/validate-assets/normalize/collect-asset-refs";

void test("collectAssetRefs matches assets by sceneId before array position", () => {
  const refs = collectAssetRefs({
    scenes: [
      {
        sceneId: 1,
        durationSec: 5,
        narration: "scene one",
        subtitle: "one",
      },
      {
        sceneId: 2,
        durationSec: 6,
        narration: "scene two",
        subtitle: "two",
      },
      {
        sceneId: 3,
        durationSec: 7,
        narration: "scene three",
        subtitle: "three",
      },
    ],
    imageAssets: [
      { sceneId: 3, imageS3Key: "assets/job/images/scene-3.png" },
      { sceneId: 1, imageS3Key: "assets/job/images/scene-1.png" },
    ],
    voiceAssets: [
      { sceneId: 2, voiceS3Key: "assets/job/voice/scene-2.mp3" },
      { voiceS3Key: "assets/job/voice/unscoped-fallback.mp3" },
    ],
    videoAssets: [
      { sceneId: 1, videoClipS3Key: "assets/job/videos/scene-1.mp4" },
    ],
  });

  assert.deepEqual(
    refs.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key: scene.imageS3Key,
      voiceS3Key: scene.voiceS3Key,
      videoClipS3Key: scene.videoClipS3Key,
    })),
    [
      {
        sceneId: 1,
        imageS3Key: "assets/job/images/scene-1.png",
        voiceS3Key: "assets/job/voice/unscoped-fallback.mp3",
        videoClipS3Key: "assets/job/videos/scene-1.mp4",
      },
      {
        sceneId: 2,
        imageS3Key: null,
        voiceS3Key: "assets/job/voice/scene-2.mp3",
        videoClipS3Key: null,
      },
      {
        sceneId: 3,
        imageS3Key: "assets/job/images/scene-3.png",
        voiceS3Key: null,
        videoClipS3Key: null,
      },
    ],
  );
});

void test("parseUpdateSceneJsonArgs accepts stringified sceneJson payloads", () => {
  const parsed = parseUpdateSceneJsonArgs({
    input: {
      jobId: "job_123",
      sceneJson: JSON.stringify({
        videoTitle: "title",
        language: "ko",
        scenes: [
          {
            sceneId: 1,
            durationSec: 5,
            narration: "narration",
            imagePrompt: "image prompt",
            subtitle: "subtitle",
          },
        ],
      }),
    },
  });

  assert.equal(parsed.jobId, "job_123");
  assert.equal(parsed.sceneJson.scenes[0]?.sceneId, 1);
});

void test("parseUpdateSceneJsonArgs rejects duplicate scene ids", () => {
  assert.throws(
    () =>
      parseUpdateSceneJsonArgs({
        input: {
          jobId: "job_123",
          sceneJson: {
            videoTitle: "title",
            language: "ko",
            scenes: [
              {
                sceneId: 1,
                durationSec: 5,
                narration: "scene one",
                imagePrompt: "image prompt one",
                subtitle: "subtitle one",
              },
              {
                sceneId: 1,
                durationSec: 6,
                narration: "scene two",
                imagePrompt: "image prompt two",
                subtitle: "subtitle two",
              },
            ],
          },
        },
      }),
    /sceneJson sceneId must be unique/,
  );
});

void test("parseUpdateSceneJsonArgs rejects non-integer scene ids", () => {
  assert.throws(
    () =>
      parseUpdateSceneJsonArgs({
        input: {
          jobId: "job_123",
          sceneJson: {
            videoTitle: "title",
            language: "ko",
            scenes: [
              {
                sceneId: 1.5,
                durationSec: 5,
                narration: "scene one",
                imagePrompt: "image prompt one",
                subtitle: "subtitle one",
              },
            ],
          },
        },
      }),
    /integer|Invalid input/i,
  );
});
