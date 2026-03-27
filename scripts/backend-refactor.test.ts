import assert from "node:assert/strict";
import test from "node:test";

import { parseUpdateSceneJsonArgs } from "../services/admin/generations/update-scene-json/normalize/parse-update-scene-json-args";
import { updateLlmStepSettings } from "../services/admin/settings/update-llm-settings/repo/update-llm-step-settings";
import { collectAssetRefs } from "../services/composition/validate-assets/normalize/collect-asset-refs";
import { generateStructuredDataWithProvider } from "../services/shared/lib/providers/llm";

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
  assert.equal(parsed.sceneJson.scenes[0]?.subtitle, "narration");
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

void test("updateLlmStepSettings rejects GEMINI until runtime support exists", async () => {
  await assert.rejects(
    () =>
      updateLlmStepSettings({
        actor: "tester",
        stepKey: "job-plan",
        provider: "GEMINI",
        model: "gemini-2.5-pro",
        temperature: 0.2,
        secretIdEnvVar: "GEMINI_SECRET_ID",
        promptVersion: "v1",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    /not supported by runtime yet/,
  );
});

void test("generateStructuredDataWithProvider does not fallback unsupported providers", async () => {
  await assert.rejects(
    () =>
      generateStructuredDataWithProvider({
        jobId: "job_123",
        stepKey: "job-plan",
        prompt: "prompt",
        template: {
          stepKey: "job-plan",
          version: "v1",
          systemPrompt: "system",
          userPrompt: "user",
        },
        config: {
          stepKey: "job-plan",
          provider: "gemini",
          model: "gemini-2.5-pro",
          temperature: 0.2,
          secretIdEnvVar: "GEMINI_SECRET_ID",
        },
        validate: (payload) => payload,
        buildMockResult: () => ({ mocked: true }),
      }),
    /Unsupported LLM provider: gemini/,
  );
});
