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
  assert.equal(renderPlan.canvas.backgroundColor, "#000000");
  assert.equal(renderPlan.canvas.videoScale, 1);
  assert.equal(renderPlan.canvas.videoCropMode, "cover");
  assert.equal(renderPlan.mediaFrame.x, 0);
  assert.equal(renderPlan.mediaFrame.y, 0);
  assert.equal(renderPlan.mediaFrame.width, 1);
  assert.equal(renderPlan.mediaFrame.height, 1);
  assert.equal(renderPlan.subtitles.format, "ass");
  assert.equal(renderPlan.subtitles.style.fontFamily, "Clear Sans");
  assert.equal(renderPlan.subtitles.style.fontWeight, "regular");
  assert.equal(renderPlan.preview.maxDurationSec, 12);
  assert.equal(renderPlan.scenes[0]?.durationSec, 6.2);
  assert.equal(renderPlan.scenes[0]?.gapAfterSec, 0.5);
  assert.equal(renderPlan.scenes[1]?.startSec, 6.7);
  assert.equal(renderPlan.overlays.length, 1);
  assert.equal(renderPlan.overlays[0]?.type, "image");
  assert.equal(renderPlan.outputKey, "render-plans/job_test/render-plan.json");
});

void test("render plan preserves explicit subtitle font and crop settings", () => {
  const event = {
    jobId: "job_custom",
    sceneJson: {
      videoTitle: "Custom Story",
      language: "ko",
      scenes: [
        {
          sceneId: 1,
          durationSec: 4,
          narration: "커스텀 나레이션",
          subtitle: "커스텀 자막",
        },
      ],
    },
  };

  const builtScenes = buildRenderPlanScenes(event);
  const renderPlan = buildRenderPlan(event, builtScenes, {
    output: {
      format: "mp4",
      size: { width: 1080, height: 1920 },
      fps: 30,
    },
    canvas: {
      backgroundColor: "#112233",
      videoScale: 0.8,
      videoCropMode: "contain",
    },
    mediaFrame: {
      x: 0.1,
      y: 0.08,
      width: 0.8,
      height: 0.46,
    },
    previewMaxDurationSec: 12,
    subtitles: {
      burnIn: true,
      format: "ass",
      style: {
        fontFamily: "DejaVu Serif",
        fontSize: 44,
        fontWeight: "bold",
        lineHeight: 1,
        opacity: 1,
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 2,
        position: "center",
        offset: { x: 0, y: 0.12 },
      },
    },
    sceneGapSec: 0.5,
    defaultOverlays: [],
  });

  assert.equal(renderPlan.canvas.backgroundColor, "#112233");
  assert.equal(renderPlan.canvas.videoScale, 0.8);
  assert.equal(renderPlan.canvas.videoCropMode, "contain");
  assert.equal(renderPlan.mediaFrame.x, 0.1);
  assert.equal(renderPlan.mediaFrame.y, 0.08);
  assert.equal(renderPlan.mediaFrame.width, 0.8);
  assert.equal(renderPlan.mediaFrame.height, 0.46);
  assert.equal(renderPlan.subtitles.style.fontFamily, "DejaVu Serif");
  assert.equal(renderPlan.subtitles.style.fontSize, 44);
  assert.equal(renderPlan.subtitles.style.fontWeight, "bold");
  assert.equal(renderPlan.subtitles.style.offset.y, 0.12);
});

void test("render plan splits subtitle text into timed sentence segments", () => {
  const event = {
    jobId: "job_segments",
    sceneJson: {
      videoTitle: "Segment Story",
      language: "ko",
      scenes: [
        {
          sceneId: 1,
          durationSec: 6,
          narration: "첫 문장입니다. 두 번째 문장입니다. 마지막 문장입니다.",
          subtitle: "첫 문장입니다. 두 번째 문장입니다. 마지막 문장입니다.",
        },
      ],
    },
  };

  const builtScenes = buildRenderPlanScenes(event);
  const firstScene = builtScenes.scenes[0];

  assert.ok(firstScene);
  assert.equal(firstScene?.subtitleSegments?.length, 3);
  assert.equal(firstScene?.subtitleSegments?.[0]?.text, "첫 문장입니다.");
  assert.equal(firstScene?.subtitleSegments?.[2]?.endSec, firstScene?.endSec);
});

void test("render plan maps subtitle color and saved text overlays into overlay events", () => {
  const event = {
    jobId: "job_overlay_text",
    sceneJson: {
      videoTitle: "Overlay Story",
      language: "ko",
      scenes: [
        {
          sceneId: 1,
          durationSec: 5,
          narration: "타이틀 오버레이 테스트",
          subtitle: "자막 색상 테스트",
        },
      ],
    },
  };

  const builtScenes = buildRenderPlanScenes(event);
  const renderPlan = buildRenderPlan(event, builtScenes, {
    output: {
      format: "mp4",
      size: { width: 1080, height: 1920 },
      fps: 30,
    },
    canvas: {
      backgroundColor: "#000000",
      videoScale: 1,
      videoCropMode: "cover",
    },
    mediaFrame: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    previewMaxDurationSec: 12,
    subtitles: {
      burnIn: true,
      format: "ass",
      style: {
        fontFamily: "Clear Sans",
        fontSize: 36,
        fontWeight: "bold",
        lineHeight: 1,
        opacity: 1,
        color: "#FFDD00",
        strokeColor: "#000000",
        strokeWidth: 2,
        position: "bottom",
        offset: { x: 0, y: 0 },
      },
    },
    sceneGapSec: 0.5,
    defaultOverlays: [
      {
        overlayId: "headline",
        type: "text",
        text: "오늘의 제목",
        placement: {
          x: 0.1,
          y: 0.12,
          width: 0.72,
          height: 0.05,
        },
        style: {
          fontFamily: "DejaVu Sans",
          fontSize: 40,
          fontWeight: "bold",
          color: "#FFFFFF",
          strokeColor: "#000000",
          strokeWidth: 2,
          align: "center",
        },
        zIndex: 10,
      },
    ],
  });

  assert.equal(renderPlan.subtitles.style.color, "#FFDD00");
  assert.equal(renderPlan.overlays.length, 1);
  assert.equal(renderPlan.overlays[0]?.type, "text");
  assert.equal(renderPlan.overlays[0]?.text, "오늘의 제목");
  assert.equal(renderPlan.overlays[0]?.style.fontWeight, "bold");
});
