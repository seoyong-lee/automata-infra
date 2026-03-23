import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRenderPlan,
  buildRenderPlanScenes,
} from "../services/composition/render-plan";

void test("render plan includes ffmpeg-friendly defaults and extends scenes for voice", () => {
  const event = {
    jobId: "job_test",
    sceneJson: {
      videoTitle: "Test Story",
      language: "ko",
      scenes: [
        {
          sceneId: 1,
          durationSec: 4,
          narration: "첫 번째 나레이션",
          subtitle: "첫 번째 자막",
          bgmMood: "tense drone",
          sfx: ["hit"],
        },
        {
          sceneId: 2,
          durationSec: 5,
          narration: "두 번째 나레이션",
          subtitle: "두 번째 자막",
        },
      ],
    },
    imageAssets: [
      { sceneId: 1, imageS3Key: "assets/job_test/images/scene-1.png" },
    ],
    videoAssets: [
      { sceneId: 2, videoClipS3Key: "assets/job_test/videos/scene-2.mp4" },
    ],
    voiceAssets: [
      {
        sceneId: 1,
        voiceS3Key: "assets/job_test/tts/scene-1.mp3",
        voiceDurationSec: 6.2,
      },
      {
        sceneId: 2,
        voiceS3Key: "assets/job_test/tts/scene-2.mp3",
        voiceDurationSec: 4.4,
      },
    ],
    overlays: [
      {
        overlayId: "brand_logo",
        type: "image" as const,
        src: "assets/job_test/overlays/logo.png",
        placement: {
          x: 0.04,
          y: 0.04,
          width: 0.16,
          height: 0.16,
        },
        opacity: 0.92,
      },
    ],
  };

  const builtScenes = buildRenderPlanScenes(event);
  const renderPlan = buildRenderPlan(event, builtScenes);

  assert.equal(renderPlan.output.size.width, 1080);
  assert.equal(renderPlan.output.size.height, 1920);
  assert.equal(renderPlan.output.fps, 30);
  assert.equal(renderPlan.renderEngine, "ffmpeg-fargate");
  assert.equal(renderPlan.subtitles.format, "ass");
  assert.equal(renderPlan.subtitles.style.fontFamily, "Clear Sans");
  assert.equal(renderPlan.preview.maxDurationSec, 12);
  assert.equal(renderPlan.scenes[0]?.durationSec, 6.2);
  assert.equal(renderPlan.scenes[0]?.gapAfterSec, 0.5);
  assert.equal(renderPlan.scenes[1]?.startSec, 6.7);
  assert.equal(renderPlan.overlays.length, 1);
  assert.equal(renderPlan.overlays[0]?.type, "image");
  assert.equal(renderPlan.outputKey, "render-plans/job_test/render-plan.json");
});
