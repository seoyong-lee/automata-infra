/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/fargate-renderer-finalize-render-output.d.ts" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRenderPlan,
  buildRenderPlanScenes,
  resolveRenderPolicyConfig,
} from "../services/composition/render-plan";
import { buildSubtitleAss } from "../services/admin/final/run-final-composition/mapper/build-subtitle-ass";

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
          startTransition: {
            type: "fadeblack" as const,
            durationSec: 0.6,
          },
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
  assert.equal(renderPlan.scenes[1]?.startTransition?.type, "fadeblack");
  assert.equal(renderPlan.scenes[1]?.startTransition?.durationSec, 0.6);
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
        maxWidth: 0.64,
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
  assert.equal(renderPlan.subtitles.style.maxWidth, 0.64);
  assert.equal(renderPlan.subtitles.style.offset.y, 0.12);
});

void test("render plan splits subtitle text into timed phrase segments", () => {
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
        maxWidth: 0.88,
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

void test("render plan falls back to preset-level render settings", () => {
  const event = {
    jobId: "job_preset_defaults",
    sceneJson: {
      videoTitle: "Preset Defaults Story",
      language: "ko",
      scenes: [
        {
          sceneId: 1,
          durationSec: 5,
          narration: "프리셋 기본 레이아웃 테스트",
          subtitle: "프리셋 기본 레이아웃 테스트",
        },
      ],
    },
  };

  const config = resolveRenderPolicyConfig(event, {
    resolvedPolicy: {
      presetId: "preset-layout-test",
      format: "template-short",
      duration: "short",
      primaryPlatformPreset: "9:16",
      styleTags: ["minimal"],
      assetStrategy: "mixed",
      stylePreset: "layout_test",
      capabilities: {
        voiceMode: "required",
        subtitleMode: "required",
        layoutMode: "template",
        supportsAiVideo: true,
        supportsAiImage: true,
        supportsStockVideo: true,
        supportsStockImage: true,
        supportsBgm: true,
        supportsSfx: false,
        supportsVoiceProfile: false,
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
        recommendedGenerationOrder: ["script", "voice", "image", "video"],
      },
      renderSettings: {
        subtitleEnabled: true,
        subtitleColor: "#AABBCC",
        backgroundColor: "#112233",
        videoCropMode: "contain",
        videoFrameX: 0.08,
        videoFrameY: 0.1,
        videoFrameWidth: 0.84,
        videoFrameHeight: 0.5,
      },
    },
  });

  assert.equal(config.subtitles.burnIn, true);
  assert.equal(config.subtitles.style.color, "#AABBCC");
  assert.equal(config.canvas.backgroundColor, "#112233");
  assert.equal(config.canvas.videoCropMode, "contain");
  assert.equal(config.mediaFrame.x, 0.08);
  assert.equal(config.mediaFrame.y, 0.1);
  assert.equal(config.mediaFrame.width, 0.84);
  assert.equal(config.mediaFrame.height, 0.5);
});

void test("subtitle ass wraps long subtitle and title overlay text", () => {
  const ass = buildSubtitleAss({
    output: {
      format: "mp4",
      size: { width: 1080, height: 1920 },
      fps: 30,
    },
    totalDurationSec: 6,
    subtitles: {
      burnIn: true,
      format: "ass",
      style: {
        fontFamily: "Clear Sans",
        fontSize: 96,
        fontWeight: "bold",
        lineHeight: 1,
        opacity: 1,
        maxWidth: 0.88,
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 2,
        position: "bottom",
        offset: { x: 0, y: 0 },
      },
    },
    scenes: [
      {
        sceneId: 1,
        startSec: 0,
        endSec: 6,
        durationSec: 6,
        gapAfterSec: 0,
        subtitle:
          "자막이 화면 가로 길이를 넘어가지 않도록 실제 렌더에서 줄바꿈되어야 합니다",
      },
    ],
    overlays: [
      {
        overlayId: "headline",
        type: "text",
        text: "강아지가 사람과 함께 살기 시작했던 이유",
        placement: {
          x: 0.06,
          y: 0.05,
          width: 0.88,
          height: 0.12,
        },
        style: {
          fontFamily: "Clear Sans",
          fontSize: 28,
          fontWeight: "bold",
          color: "#FFFFFF",
          strokeColor: "#000000",
          strokeWidth: 2,
          opacity: 1,
          align: "center",
        },
        startSec: 0,
        endSec: 6,
      },
    ],
  });

  assert.match(ass, /강아지가 사람과 함께\\N살기 시작했던 이유/);
  const subtitleDialogueLine = ass
    .split("\n")
    .find((line) => line.startsWith("Dialogue: 0,") && line.includes("자막이"));
  assert.ok(subtitleDialogueLine);
  const subtitleBreaks = subtitleDialogueLine.match(/\\N/g) ?? [];
  assert.ok(
    subtitleBreaks.length <= 1,
    "subtitle burn-in should use at most two lines (one line break)",
  );
  assert.match(ass, /\\an5/);
});

void test("scene transition graph chains per-scene start transitions", async () => {
  const { buildSceneTransitionGraph } =
    await import("../services/composition/fargate-renderer/usecase/finalize-render-output.mjs");

  const graph = buildSceneTransitionGraph([
    {
      segmentPath: "/tmp/scene-1.mp4",
      durationSec: 4,
      scene: { sceneId: 1 },
    },
    {
      segmentPath: "/tmp/scene-2.mp4",
      durationSec: 5,
      scene: {
        sceneId: 2,
        startTransition: {
          type: "fadeblack",
          durationSec: 0.5,
        },
      },
    },
    {
      segmentPath: "/tmp/scene-3.mp4",
      durationSec: 4,
      scene: {
        sceneId: 3,
      },
    },
  ]);

  assert.ok(graph);
  assert.match(graph.filterComplex, /xfade=transition=fadeblack/);
  assert.match(graph.filterComplex, /xfade=transition=fade:duration=0\.001/);
  assert.match(graph.filterComplex, /acrossfade=d=0\.500/);
  assert.equal(graph.videoLabel, "[vout]");
  assert.equal(graph.audioLabel, "[aout]");
});
