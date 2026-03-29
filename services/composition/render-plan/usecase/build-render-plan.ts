import type {
  JobRenderSettings,
  JobRenderTextOverlay,
} from "../../../shared/lib/contracts/canonical-io-schemas";
import type { ResolvedPolicy } from "../../../shared/lib/contracts/content-presets";
import type {
  RenderPlan,
  RenderPlanCanvas,
  RenderPlanMediaFrame,
  RenderPlanOverlay,
  RenderPlanSubtitleStyle,
} from "../../../../types/render/render-plan";
import type {
  BuiltRenderPlanScenes,
  RenderPlanEvent,
  RenderPolicyConfig,
  StoredRenderInputs,
} from "../types";

const DEFAULT_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1920,
  },
  fps: 30,
} as const;
const SQUARE_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1080,
  },
  fps: 30,
} as const;
const PORTRAIT_4X5_OUTPUT = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1350,
  },
  fps: 30,
} as const;
const LANDSCAPE_OUTPUT = {
  format: "mp4",
  size: {
    width: 1920,
    height: 1080,
  },
  fps: 30,
} as const;
const DEFAULT_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  fontFamily: "Clear Sans",
  fontSize: 32,
  fontWeight: "regular",
  lineHeight: 1,
  opacity: 1,
  maxWidth: 0.88,
  color: "#000000",
  strokeColor: "#ffffff",
  strokeWidth: 2,
  position: "center",
  offset: {
    x: -0.019,
    y: 0,
  },
} as const;
const BOLD_CAPTION_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 42,
  fontWeight: "bold",
  color: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 3,
  position: "bottom",
  offset: {
    x: 0,
    y: -0.02,
  },
};
const MINIMAL_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 26,
  strokeWidth: 1,
  position: "bottom",
  offset: {
    x: 0,
    y: 0.01,
  },
};
const DOCUMENTARY_SUBTITLE_STYLE: RenderPlanSubtitleStyle = {
  ...DEFAULT_SUBTITLE_STYLE,
  fontSize: 34,
  color: "#FFFFFF",
  strokeColor: "#111111",
  strokeWidth: 2,
  position: "bottom",
};
const DEFAULT_CANVAS: RenderPlanCanvas = {
  backgroundColor: "#000000",
  videoScale: 1,
  videoCropMode: "cover",
};
const DEFAULT_MEDIA_FRAME: RenderPlanMediaFrame = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};
const PREVIEW_SUBTITLE_REFERENCE_SHORT_EDGE = 320;
const DEFAULT_TEXT_OVERLAY_WIDTH = 0.72;
const DEFAULT_TEXT_OVERLAY_COLOR = "#FFFFFF";

const subtitleStyleByPreset: Record<string, RenderPlanSubtitleStyle> = {
  "bold-caption-news": BOLD_CAPTION_SUBTITLE_STYLE,
  "minimal-quote": MINIMAL_SUBTITLE_STYLE,
  "documentary-lower-third": DOCUMENTARY_SUBTITLE_STYLE,
};

const subtitleFontFamilyByPreset: Record<string, string> = {
  serif: "DejaVu Serif",
  sans: "DejaVu Sans",
  display: "DejaVu Sans Condensed",
};

const resolveFontFamilyFromPreset = (
  fontPreset?: string,
  fallback = "Clear Sans",
): string => {
  const normalizedFontPreset = fontPreset?.trim().toLowerCase();
  if (!normalizedFontPreset || normalizedFontPreset === "default") {
    return fallback;
  }
  return subtitleFontFamilyByPreset[normalizedFontPreset] ?? fallback;
};

const resolveBaseSubtitleStyle = (
  resolvedPolicy?: ResolvedPolicy,
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  const preset =
    renderSettings?.subtitleStylePreset ?? resolvedPolicy?.subtitleStylePreset;
  if (preset && subtitleStyleByPreset[preset]) {
    return subtitleStyleByPreset[preset];
  }
  if (resolvedPolicy?.format === "cinematic-visual") {
    return MINIMAL_SUBTITLE_STYLE;
  }
  if (resolvedPolicy?.format === "template-short") {
    return BOLD_CAPTION_SUBTITLE_STYLE;
  }
  return DEFAULT_SUBTITLE_STYLE;
};

const resolveOutputByPlatformPreset = (
  platformPreset?: string,
): RenderPlan["output"] => {
  if (platformPreset === "1:1") {
    return SQUARE_OUTPUT;
  }
  if (platformPreset === "4:5") {
    return PORTRAIT_4X5_OUTPUT;
  }
  if (platformPreset === "16:9") {
    return LANDSCAPE_OUTPUT;
  }
  return DEFAULT_OUTPUT;
};

const resolveSubtitleStyle = (
  resolvedPolicy?: ResolvedPolicy,
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  const baseStyle = resolveBaseSubtitleStyle(resolvedPolicy, renderSettings);
  if (!renderSettings?.subtitleColor) {
    return baseStyle;
  }
  return {
    ...baseStyle,
    color: renderSettings.subtitleColor,
  };
};

const resolveSubtitlePosition = (
  style: RenderPlanSubtitleStyle,
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  if (
    !renderSettings?.subtitlePosition &&
    typeof renderSettings?.subtitleOffsetY !== "number"
  ) {
    return style;
  }
  return {
    ...style,
    position: renderSettings?.subtitlePosition ?? style.position,
    offset: {
      ...style.offset,
      y:
        typeof renderSettings?.subtitleOffsetY === "number"
          ? renderSettings.subtitleOffsetY
          : style.offset.y,
    },
  };
};

const resolveSubtitleFont = (
  style: RenderPlanSubtitleStyle,
  output: RenderPlan["output"],
  renderSettings?: JobRenderSettings,
): RenderPlanSubtitleStyle => {
  const resolvedFontFamily = resolveFontFamilyFromPreset(
    renderSettings?.subtitleFontPreset,
    style.fontFamily,
  );
  const outputShortEdge = Math.min(output.size.width, output.size.height);
  const scaledFontSize = renderSettings?.subtitleFontSize
    ? Math.round(
        renderSettings.subtitleFontSize *
          (outputShortEdge / PREVIEW_SUBTITLE_REFERENCE_SHORT_EDGE),
      )
    : style.fontSize;
  return {
    ...style,
    fontFamily: resolvedFontFamily,
    fontWeight: renderSettings?.subtitleFontWeight ?? style.fontWeight,
    fontSize: scaledFontSize,
    maxWidth: renderSettings?.subtitleMaxWidth ?? style.maxWidth,
  };
};

const resolveSceneGapSec = (resolvedPolicy?: ResolvedPolicy): number => {
  const layoutMode = resolvedPolicy?.capabilities.layoutMode;
  if (layoutMode === "template") {
    return 0.2;
  }
  if (layoutMode === "still-motion") {
    return 0.1;
  }
  if (layoutMode === "cinematic") {
    return 0.35;
  }
  return 0.5;
};

const resolvePreviewMaxDurationSec = (
  resolvedPolicy?: ResolvedPolicy,
): number => {
  if (resolvedPolicy?.duration === "long") {
    return 20;
  }
  if (resolvedPolicy?.format === "cinematic-visual") {
    return 8;
  }
  if (resolvedPolicy?.format === "template-short") {
    return 10;
  }
  return 12;
};

const buildUserTextOverlay = (
  overlay: JobRenderTextOverlay,
  output: RenderPlan["output"],
  index: number,
): RenderPlanOverlay => {
  const width = Math.min(
    1,
    Math.max(0.2, overlay.width ?? DEFAULT_TEXT_OVERLAY_WIDTH),
  );
  const fontSize = Math.max(12, Math.min(96, overlay.fontSize ?? 40));
  const normalizedHeight = Math.min(
    0.22,
    Math.max(0.04, (fontSize * 1.8) / output.size.height),
  );
  return {
    overlayId: overlay.overlayId,
    type: "text",
    text: overlay.text,
    placement: {
      x: Math.min(1 - width, Math.max(0, overlay.x)),
      y: Math.min(1 - normalizedHeight, Math.max(0, overlay.y)),
      width,
      height: normalizedHeight,
    },
    style: {
      fontFamily: resolveFontFamilyFromPreset(overlay.fontPreset),
      fontSize,
      fontWeight: overlay.fontWeight ?? "regular",
      color: overlay.color ?? DEFAULT_TEXT_OVERLAY_COLOR,
      strokeColor: "#000000",
      strokeWidth: 0,
      align: "center",
    },
    zIndex: 10 + index,
  };
};

const buildUserTextOverlays = (
  renderSettings: JobRenderSettings | undefined,
  output: RenderPlan["output"],
): RenderPlanOverlay[] => {
  return (
    renderSettings?.textOverlays
      ?.filter((overlay) => overlay.text.trim().length > 0)
      .map((overlay, index) => buildUserTextOverlay(overlay, output, index)) ??
    []
  );
};

const buildDefaultOverlays = (
  event: RenderPlanEvent,
  resolvedPolicy?: ResolvedPolicy,
): RenderPlanOverlay[] => {
  if (
    !resolvedPolicy?.capabilities.supportsOverlayTemplate ||
    resolvedPolicy.capabilities.layoutMode !== "template"
  ) {
    return [];
  }

  return [
    {
      overlayId: "title-template",
      type: "text",
      text: event.sceneJson.videoTitle,
      placement: {
        x: 0.06,
        y: 0.05,
        width: 0.88,
        height: 0.12,
      },
      style: {
        fontFamily: "Clear Sans",
        fontSize: 28,
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 2,
        align: "center",
      },
      startSec: 0,
      endSec: 4,
      zIndex: 5,
    },
  ];
};

const resolveCanvas = (
  renderSettings?: JobRenderSettings,
): RenderPlanCanvas => {
  return {
    backgroundColor:
      renderSettings?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    videoScale: renderSettings?.videoScale ?? DEFAULT_CANVAS.videoScale,
    videoCropMode:
      renderSettings?.videoCropMode ?? DEFAULT_CANVAS.videoCropMode,
  };
};

const resolveMediaFrame = (
  renderSettings?: JobRenderSettings,
): RenderPlanMediaFrame => {
  const width = Math.min(
    1,
    Math.max(0.1, renderSettings?.videoFrameWidth ?? DEFAULT_MEDIA_FRAME.width),
  );
  const height = Math.min(
    1,
    Math.max(
      0.1,
      renderSettings?.videoFrameHeight ?? DEFAULT_MEDIA_FRAME.height,
    ),
  );
  const x = Math.min(
    1 - width,
    Math.max(0, renderSettings?.videoFrameX ?? (1 - width) / 2),
  );
  const y = Math.min(
    1 - height,
    Math.max(0, renderSettings?.videoFrameY ?? (1 - height) / 2),
  );
  return { x, y, width, height };
};

const resolveSoundtrackMood = (event: RenderPlanEvent): string | undefined => {
  return event.sceneJson.scenes.find(
    (scene) =>
      typeof scene.bgmMood === "string" && scene.bgmMood.trim().length > 0,
  )?.bgmMood;
};

export const resolveRenderPolicyConfig = (
  event: RenderPlanEvent,
  input: StoredRenderInputs = {},
): RenderPolicyConfig => {
  const { resolvedPolicy, renderSettings } = input;
  const output = resolveOutputByPlatformPreset(
    resolvedPolicy?.primaryPlatformPreset,
  );
  const subtitleStyle = resolveSubtitleFont(
    resolveSubtitlePosition(
      resolveSubtitleStyle(resolvedPolicy, renderSettings),
      renderSettings,
    ),
    output,
    renderSettings,
  );
  const defaultBurnIn =
    resolvedPolicy?.capabilities.layoutMode === "template" ||
    resolvedPolicy?.capabilities.layoutMode === "still-motion";
  return {
    output,
    canvas: resolveCanvas(renderSettings),
    mediaFrame: resolveMediaFrame(renderSettings),
    previewMaxDurationSec: resolvePreviewMaxDurationSec(resolvedPolicy),
    subtitles: {
      burnIn: renderSettings?.subtitleEnabled ?? defaultBurnIn,
      format: "ass",
      style: subtitleStyle,
    },
    sceneGapSec: resolveSceneGapSec(resolvedPolicy),
    defaultOverlays: [
      ...buildDefaultOverlays(event, resolvedPolicy),
      ...buildUserTextOverlays(renderSettings, output),
    ],
  };
};

export const buildRenderPlan = (
  event: RenderPlanEvent,
  builtScenes: BuiltRenderPlanScenes,
  config: RenderPolicyConfig = resolveRenderPolicyConfig(event),
): RenderPlan => {
  return {
    renderEngine: "ffmpeg-fargate",
    videoTitle: event.sceneJson.videoTitle,
    language: event.sceneJson.language,
    output: config.output,
    canvas: config.canvas,
    mediaFrame: config.mediaFrame,
    preview: {
      enabled: true,
      maxDurationSec: config.previewMaxDurationSec,
    },
    subtitles: config.subtitles,
    totalDurationSec: builtScenes.totalDurationSec,
    scenes: builtScenes.scenes,
    overlays:
      event.overlays && event.overlays.length > 0
        ? event.overlays
        : config.defaultOverlays,
    soundtrackMood: resolveSoundtrackMood(event),
    outputKey: `render-plans/${event.jobId}/render-plan.json`,
  };
};
