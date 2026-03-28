import test from "node:test";
import assert from "node:assert/strict";
import sceneJsonExpected from "./fixtures/generation/scene-json.expected.json";
import sceneJsonInput from "./fixtures/generation/scene-json.input.json";
import smokeDataset from "./fixtures/generation/smoke-dataset.json";
import topicPlanExpected from "./fixtures/generation/topic-plan.expected.json";
import topicPlanSeed from "./fixtures/generation/topic-plan.seed.json";
import { buildRenderPlanScenes } from "../services/composition/render-plan";
import { generateSceneImages } from "../services/image/usecase/generate-scene-images";
import { buildSceneJson } from "../services/script/usecase/build-scene-json";
import {
  createJobPlan,
  type JobPlanResult,
} from "../services/plan/usecase/create-job-plan";
import { estimateMinimumVoiceDurationSec } from "../services/shared/lib/providers/media/elevenlabs-voice";
import { generateSceneVideos } from "../services/video-generation/usecase/generate-scene-videos";
import { generateSceneVoices } from "../services/voice/usecase/generate-scene-voices";
import {
  applyPromptTemplateOverride,
  type GenerateStructuredData,
  type GenerateStructuredDataInput,
  type GenerateStructuredDataResult,
  type LlmPromptTemplate,
} from "../services/shared/lib/llm";
import type { SceneJson } from "../types/render/scene-json";

const buildMetadata = <T>(): GenerateStructuredDataResult<T>["metadata"] => {
  return {
    provider: "mock",
    model: "test-double",
    mocked: true,
    promptVersion: "test",
    providerLogS3Key: "logs/test/mock.json",
  };
};

const buildSceneJsonForScenario = (input: {
  titleIdea: string;
  targetLanguage: string;
}): SceneJson => {
  return {
    videoTitle: input.titleIdea,
    language: input.targetLanguage,
    scenes: [
      {
        sceneId: 1,
        durationSec: 6,
        narration: `${input.titleIdea} begins with a quiet hook.`,
        imagePrompt: `${input.titleIdea}, cinematic still frame, moonlight`,
        videoPrompt: `${input.titleIdea}, slow cinematic camera move`,
        subtitle: `${input.titleIdea} begins with a quiet hook.`,
      },
      {
        sceneId: 2,
        durationSec: 6,
        narration: `${input.titleIdea} ends with a concise takeaway.`,
        imagePrompt: `${input.titleIdea}, final visual beat, cinematic close-up`,
        subtitle: `${input.titleIdea} ends with a concise takeaway.`,
      },
    ],
  };
};

const buildResolvedPolicyWithOverrides = (): NonNullable<
  JobPlanResult["resolvedPolicy"]
> => {
  return {
    presetId: "narrated-documentary-short",
    format: "narrated-explainer",
    duration: "short",
    primaryPlatformPreset: "9:16",
    styleTags: ["documentary", "cinematic"],
    assetStrategy: "mixed",
    stylePreset: "documentary_voiceover",
    capabilities: {
      voiceMode: "required",
      subtitleMode: "required",
      layoutMode: "free-scene",
      supportsAiVideo: true,
      supportsAiImage: true,
      supportsStockVideo: true,
      supportsStockImage: true,
      supportsBgm: true,
      supportsSfx: false,
      supportsVoiceProfile: true,
      supportsOverlayTemplate: false,
    },
    assetMenu: {
      showScript: true,
      showNarration: true,
      showSubtitles: true,
      showImageAssets: true,
      showVideoAssets: true,
      showStockPicker: true,
      showBgm: true,
      showSfx: false,
      showOverlayEditor: false,
      recommendedGenerationOrder: ["script", "voice", "image", "video", "bgm"],
    },
    sceneCountMin: 4,
    sceneCountMax: 7,
    renderPreset: "narrated-doc-short",
    preferredImageProvider: "openai",
    preferredVideoProvider: "runway",
    promptOverrides: {
      jobPlan: {
        systemPrompt: "Documentary job-plan system",
        userPrompt: "Documentary job-plan user",
      },
      sceneJson: {
        systemPrompt: "Documentary scene-json system",
        userPrompt: "Documentary scene-json user",
      },
    },
  };
};

void test("applyPromptTemplateOverride replaces base prompts", () => {
  const template: LlmPromptTemplate = {
    stepKey: "scene-json",
    version: "v1",
    systemPrompt: "Base system",
    userPrompt: "Base user",
  };

  const result = applyPromptTemplateOverride(template, {
    systemPrompt: "Preset system",
    userPrompt: "Preset user",
  });

  assert.equal(result.version, "v1:preset-override");
  assert.equal(result.systemPrompt, "Preset system");
  assert.equal(result.userPrompt, "Preset user");
});

void test("createJobPlan uses shared LLM generation with deterministic output", async () => {
  const generateStructuredData: GenerateStructuredData = async <T>(
    input: GenerateStructuredDataInput<T>,
  ) => {
    assert.equal(input.stepKey, "job-plan");
    assert.deepEqual(input.variables, {
      contentId: "history-en",
      targetLanguage: "en",
      channelLabel: "history-en",
      contentType: "",
      variant: "",
      creativeBrief: "",
    });

    return {
      output: input.validate(topicPlanSeed),
      metadata: buildMetadata<T>(),
    };
  };

  const result = await createJobPlan({
    now: () => "2026-03-19T12:00:00.000Z",
    loadConfig: () => ({
      contentId: "history-en",
      targetLanguage: "en",
    }),
    generateStructuredData,
  });

  assert.deepEqual(result, {
    ...topicPlanExpected,
    creativeBrief: undefined,
    contentType: undefined,
    variant: undefined,
    autoPublish: undefined,
    publishAt: undefined,
  });
});

void test("buildSceneJson uses injected LLM generator and matches golden output", async () => {
  const generateStructuredData: GenerateStructuredData = async <T>(
    input: GenerateStructuredDataInput<T>,
  ) => {
    assert.equal(input.stepKey, "scene-json");
    assert.deepEqual(input.variables, {
      titleIdea: sceneJsonInput.titleIdea,
      targetLanguage: sceneJsonInput.targetLanguage,
      targetDurationSec: sceneJsonInput.targetDurationSec,
      stylePreset: sceneJsonInput.stylePreset,
      creativeBrief: "",
    });

    return {
      output: input.validate(sceneJsonExpected),
      metadata: buildMetadata<T>(),
    };
  };

  const result = await buildSceneJson(sceneJsonInput as JobPlanResult, {
    generateStructuredData,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), sceneJsonExpected);
});

void test("buildSceneJson forwards preset scene prompt override", async () => {
  const resolvedPolicy = buildResolvedPolicyWithOverrides();
  const generateStructuredData: GenerateStructuredData = async <T>(
    input: GenerateStructuredDataInput<T>,
  ) => {
    assert.equal(input.stepKey, "scene-json");
    assert.deepEqual(input.promptTemplateOverride, {
      systemPrompt: "Documentary scene-json system",
      userPrompt: "Documentary scene-json user",
    });

    return {
      output: input.validate(sceneJsonExpected),
      metadata: buildMetadata<T>(),
    };
  };

  await buildSceneJson(
    {
      ...(sceneJsonInput as JobPlanResult),
      presetId: resolvedPolicy.presetId,
      resolvedPolicy,
    },
    {
      generateStructuredData,
    },
  );
});

void test("sceneJson contract flows through asset usecases and render-plan builder", async () => {
  const imageAssets = await generateSceneImages(
    {
      jobId: sceneJsonInput.jobId,
      scenes: sceneJsonExpected.scenes.map((scene) => ({
        sceneId: scene.sceneId,
        imagePrompt: scene.imagePrompt,
      })),
      secretId: "unused",
    },
    {
      generateSceneImage: async ({ jobId, sceneId, prompt }) => ({
        provider: "mock-image",
        jobId,
        sceneId,
        prompt,
        imageS3Key: `assets/${jobId}/images/scene-${sceneId}.png`,
      }),
    },
  );

  const videoAssets = await generateSceneVideos(
    {
      jobId: sceneJsonInput.jobId,
      scenes: sceneJsonExpected.scenes
        .filter((scene) => scene.videoPrompt)
        .map((scene) => ({
          sceneId: scene.sceneId,
          videoPrompt: scene.videoPrompt ?? "",
        })),
      secretId: "unused",
    },
    {
      generateSceneVideo: async ({ jobId, sceneId, prompt }) => ({
        provider: "mock-video",
        jobId,
        sceneId,
        prompt,
        videoS3Key: `assets/${jobId}/videos/scene-${sceneId}.mp4`,
      }),
    },
  );

  const voiceAssets = await generateSceneVoices(
    {
      jobId: sceneJsonInput.jobId,
      scenes: sceneJsonExpected.scenes.map((scene) => ({
        sceneId: scene.sceneId,
        narration: scene.narration,
        durationSec: scene.durationSec,
      })),
      secretId: "unused",
    },
    {
      generateSceneVoice: async ({ jobId, sceneId, text }) => ({
        provider: "mock-voice",
        jobId,
        sceneId,
        text,
        voiceS3Key: `assets/${jobId}/tts/scene-${sceneId}.mp3`,
      }),
    },
  );

  const renderPlan = buildRenderPlanScenes({
    jobId: sceneJsonInput.jobId,
    sceneJson: sceneJsonExpected,
    imageAssets: imageAssets as Array<{ sceneId: number; imageS3Key: string }>,
    voiceAssets: voiceAssets as Array<{ sceneId: number; voiceS3Key: string }>,
  });

  assert.equal(imageAssets.length, sceneJsonExpected.scenes.length);
  assert.equal(videoAssets.length, 3);
  assert.equal(voiceAssets.length, sceneJsonExpected.scenes.length);
  assert.equal(renderPlan.scenes.length, sceneJsonExpected.scenes.length);
  const expectedTotalDurationSec = sceneJsonExpected.scenes.reduce(
    (sum, scene, index) => {
      const gapAfterSec = index < sceneJsonExpected.scenes.length - 1 ? 0.5 : 0;
      return (
        sum +
        Math.max(
          scene.durationSec,
          estimateMinimumVoiceDurationSec(scene.narration),
        ) +
        gapAfterSec
      );
    },
    0,
  );
  assert.equal(renderPlan.totalDurationSec, expectedTotalDurationSec);
});

void test("smoke dataset scenarios remain compatible with scene generation contract", async () => {
  for (const scenario of smokeDataset) {
    const jobPlan = {
      ...(sceneJsonInput as JobPlanResult),
      titleIdea: scenario.titleIdea,
      targetLanguage: scenario.targetLanguage,
      targetDurationSec: scenario.targetDurationSec,
      stylePreset: scenario.stylePreset,
    };

    const generateStructuredData: GenerateStructuredData = async <T>(
      input: GenerateStructuredDataInput<T>,
    ) => {
      const output = buildSceneJsonForScenario({
        titleIdea: scenario.titleIdea,
        targetLanguage: scenario.targetLanguage,
      });

      return {
        output: input.validate(output),
        metadata: buildMetadata<T>(),
      };
    };

    const result = await buildSceneJson(jobPlan, {
      generateStructuredData,
    });

    assert.equal(result.videoTitle, scenario.titleIdea);
    assert.equal(result.language, scenario.targetLanguage);
    assert.equal(result.scenes.length, 2);
    assert.ok(result.scenes.every((scene) => scene.narration.length > 0));
    assert.ok(
      result.scenes.every((scene) => scene.subtitle === scene.narration),
    );
    assert.ok(result.scenes.every((scene) => scene.imagePrompt.length > 0));
  }
});
