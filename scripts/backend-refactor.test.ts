import assert from "node:assert/strict";
import test from "node:test";

import { parseAssetPoolAssetsArgs } from "../services/admin/library/asset-pool-assets/normalize/parse-asset-pool-assets-args";
import { parseRegisterAssetPoolAssetArgs } from "../services/admin/library/register-asset-pool-asset/normalize/parse-register-asset-pool-asset-args";
import { mapAssetPoolItemToDto } from "../services/admin/shared/mapper/map-asset-pool-item";
import { parseUpdateSceneJsonArgs } from "../services/admin/generations/update-scene-json/normalize/parse-update-scene-json-args";
import { buildSceneAssetPoolItem } from "../services/shared/lib/asset-pool-ingest";
import {
  deriveScenePoolSearchTags,
  rankSceneImagePoolCandidates,
} from "../services/admin/generations/run-asset-generation/usecase/resolve-scene-image-pool-assets";
import { mapSelectedImageCandidatePatch } from "../services/admin/generations/select-scene-image-candidate/mapper/map-selected-image-candidate-patch";
import { updateLlmStepSettings } from "../services/admin/settings/update-llm-settings/repo/update-llm-step-settings";
import { collectAssetRefs } from "../services/composition/validate-assets/normalize/collect-asset-refs";
import { hasRenderableVisualAsset } from "../services/composition/validate-assets/usecase/validate-generated-assets";
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

void test("hasRenderableVisualAsset accepts either image or video assets", () => {
  assert.equal(
    hasRenderableVisualAsset({
      imageS3Key: "assets/job/images/scene-1.png",
      videoClipS3Key: null,
    }),
    true,
  );
  assert.equal(
    hasRenderableVisualAsset({
      imageS3Key: null,
      videoClipS3Key: "assets/job/videos/scene-1.mp4",
    }),
    true,
  );
  assert.equal(
    hasRenderableVisualAsset({
      imageS3Key: null,
      videoClipS3Key: null,
    }),
    false,
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
            startTransition: {
              type: "fade",
              durationSec: 0.4,
            },
          },
        ],
      }),
    },
  });

  assert.equal(parsed.jobId, "job_123");
  assert.equal(parsed.sceneJson.scenes[0]?.sceneId, 1);
  assert.equal(parsed.sceneJson.scenes[0]?.subtitle, "narration");
  assert.equal(parsed.sceneJson.scenes[0]?.startTransition?.type, "fade");
  assert.equal(parsed.sceneJson.scenes[0]?.storyBeat, "hook");
  assert.equal(
    parsed.sceneJson.scenes[0]?.visualNeed?.semanticType,
    "image_prompt",
  );
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

void test("deriveScenePoolSearchTags uses semantic and mood tags", () => {
  const tags = deriveScenePoolSearchTags({
    sceneId: 1,
    durationSec: 5,
    narration: "A dark corridor reveal",
    subtitle: "A dark corridor reveal",
    imagePrompt: "dark corridor with a figure at the end",
    storyBeat: "tension",
    visualNeed: {
      semanticType: "dark_hallway_figure",
      moodTags: ["eerie", "suspense"],
      visualTypePriority: ["pool_image", "stock_image", "ai_image"],
      avoidTags: ["logo", "text", "watermark"],
    },
  });

  assert.deepEqual(tags, ["dark", "hallway", "figure", "eerie", "suspense"]);
});

void test("rankSceneImagePoolCandidates prefers safe high-overlap assets", () => {
  const ranked = rankSceneImagePoolCandidates(
    {
      sceneId: 1,
      durationSec: 5,
      narration: "A figure stands at the end of the dark hallway.",
      subtitle: "A figure stands at the end of the dark hallway.",
      imagePrompt: "dark hallway with a silhouette",
      storyBeat: "tension",
      visualNeed: {
        semanticType: "dark_hallway_figure",
        moodTags: ["eerie", "suspense"],
        visualTypePriority: ["pool_image", "stock_image", "ai_image"],
        avoidTags: ["logo", "text", "watermark"],
      },
    },
    [
      {
        assetId: "asset-best",
        assetType: "image",
        sourceType: "stock",
        storageKey: "assets/pool/best.png",
        visualTags: ["dark", "hallway", "figure"],
        moodTags: ["eerie", "suspense"],
        qualityScore: 0.92,
        reusabilityScore: 0.81,
        reviewStatus: "approved",
        ingestedAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
        matchedTags: ["dark", "hallway", "figure", "eerie", "suspense"],
        matchedTagCount: 5,
      },
      {
        assetId: "asset-risky",
        assetType: "image",
        sourceType: "stock",
        storageKey: "assets/pool/risky.png",
        visualTags: ["dark", "hallway", "figure"],
        moodTags: ["eerie", "suspense"],
        qualityScore: 0.97,
        reusabilityScore: 0.9,
        containsText: true,
        reviewStatus: "approved",
        ingestedAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z",
        matchedTags: ["dark", "hallway", "figure", "eerie", "suspense"],
        matchedTagCount: 5,
      },
    ],
  );

  assert.equal(ranked[0]?.assetId, "asset-best");
  assert.ok((ranked[0]?.matchScore ?? 0) > (ranked[1]?.matchScore ?? 0));
});

void test("buildSceneAssetPoolItem derives pool tags from scene context", () => {
  const item = buildSceneAssetPoolItem({
    assetType: "image",
    sourceType: "ai",
    storageKey: "assets/job/images/scene-1/test.png",
    provider: "openai-image",
    scene: {
      sceneId: 1,
      durationSec: 5,
      narration: "A quiet hallway slowly reveals a silhouette.",
      subtitle: "A quiet hallway slowly reveals a silhouette.",
      imagePrompt: "quiet hallway with a silhouette at the far end",
      storyBeat: "tension",
      visualNeed: {
        semanticType: "quiet_hallway_silhouette",
        moodTags: ["eerie", "suspense"],
        visualTypePriority: ["pool_image", "stock_image", "ai_image"],
        motionHint: "slow_push_in",
        avoidTags: ["logo", "text", "watermark"],
      },
    },
  });

  assert.deepEqual(item.visualTags, [
    "quiet",
    "hallway",
    "silhouette",
    "slow",
    "push",
    "in",
  ]);
  assert.deepEqual(item.moodTags, ["eerie", "suspense"]);
  assert.equal(item.sourceType, "ai");
  assert.equal(item.reviewStatus, "approved");
});

void test("parseAssetPoolAssetsArgs applies defaults for library listing", () => {
  const parsed = parseAssetPoolAssetsArgs({
    assetType: "image",
    tags: ["dark_hallway", "eerie"],
  });

  assert.equal(parsed.assetType, "image");
  assert.deepEqual(parsed.tags, ["dark_hallway", "eerie"]);
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.nextToken, undefined);
});

void test("parseRegisterAssetPoolAssetArgs fills registration defaults", () => {
  const parsed = parseRegisterAssetPoolAssetArgs({
    input: {
      assetType: "video",
      storageKey: "assets/library/video/demo.mp4",
      visualTags: ["factory", "assembly"],
    },
  });

  assert.equal(parsed.sourceType, "internal");
  assert.equal(parsed.reviewStatus, "approved");
  assert.deepEqual(parsed.visualTags, ["factory", "assembly"]);
  assert.deepEqual(parsed.moodTags, []);
});

void test("mapAssetPoolItemToDto exposes preview urls when domain exists", () => {
  const previousDomain = process.env.PREVIEW_DISTRIBUTION_DOMAIN;
  process.env.PREVIEW_DISTRIBUTION_DOMAIN = "preview.example.com";

  try {
    const dto = mapAssetPoolItemToDto({
      assetId: "asset_demo",
      assetType: "image",
      sourceType: "internal",
      storageKey: "assets/library/image/demo.png",
      visualTags: ["factory"],
      moodTags: ["clean"],
      matchedTags: ["factory"],
      matchedTagCount: 1,
      reviewStatus: "approved",
      ingestedAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    });

    assert.equal(
      dto.storageUrl,
      "https://preview.example.com/assets/library/image/demo.png",
    );
    assert.equal(
      dto.thumbnailUrl,
      "https://preview.example.com/assets/library/image/demo.png",
    );
  } finally {
    if (previousDomain === undefined) {
      delete process.env.PREVIEW_DISTRIBUTION_DOMAIN;
    } else {
      process.env.PREVIEW_DISTRIBUTION_DOMAIN = previousDomain;
    }
  }
});

void test("mapSelectedImageCandidatePatch carries asset provenance fields", () => {
  const patch = mapSelectedImageCandidatePatch(
    {
      PK: "JOB#job_123",
      SK: "SCENE#1#IMAGE_CANDIDATE#cand_1",
      sceneId: 1,
      candidateId: "cand_1",
      candidateSource: "pool",
      assetPoolAssetId: "asset_123",
      createdAt: "2026-03-29T00:00:00.000Z",
      imageS3Key: "assets/pool/asset_123.png",
      provider: "asset-pool",
    },
    "assets/pool/asset_123.png",
  );

  assert.equal((patch as Record<string, unknown>).imageAssetId, "asset_123");
  assert.equal((patch as Record<string, unknown>).imageSelectionSource, "pool");
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
