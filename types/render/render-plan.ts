import { z } from "zod";
import { sceneStartTransitionSchema } from "../../services/shared/lib/contracts/canonical-io-schemas";

const normalizedScalarSchema = z.number().finite();
const normalizedSizeSchema = z.number().positive().max(1);

export const renderPlanOutputSchema = z.object({
  format: z.literal("mp4"),
  size: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  fps: z.number().int().positive(),
});

export const renderPlanCanvasSchema = z.object({
  backgroundColor: z
    .string()
    .trim()
    .regex(/^#?[0-9A-Fa-f]{6}$/),
  videoScale: z.number().min(0.5).max(1.25),
  videoCropMode: z.enum(["contain", "cover", "smart-crop"]),
});

export const renderPlanMediaFrameSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.1).max(1),
  height: z.number().min(0.1).max(1),
});

export const renderPlanSubtitleStyleSchema = z.object({
  fontFamily: z.string().trim().min(1),
  fontSize: z.number().positive(),
  fontWeight: z.enum(["regular", "bold"]),
  lineHeight: z.number().positive(),
  opacity: z.number().min(0).max(1),
  maxWidth: z.number().min(0.2).max(1),
  color: z.string().trim().min(1),
  strokeColor: z.string().trim().min(1),
  strokeWidth: z.number().min(0),
  /** ASS `Shadow` depth (0 = off; typical readable drop shadow 2–4). */
  shadowDepth: z.number().int().min(0).max(8).optional(),
  position: z.enum(["top", "center", "bottom"]),
  offset: z.object({
    x: normalizedScalarSchema,
    y: normalizedScalarSchema,
  }),
});

export const renderPlanSubtitleSchema = z.object({
  burnIn: z.boolean(),
  format: z.literal("ass"),
  style: renderPlanSubtitleStyleSchema,
  assS3Key: z.string().trim().min(1).optional(),
});

export const renderPlanSubtitleSegmentSchema = z.object({
  text: z.string().trim().min(1),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
});

export const renderPlanSceneSchema = z.object({
  sceneId: z.number().int().nonnegative(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  durationSec: z.number().positive(),
  gapAfterSec: z.number().min(0),
  imageS3Key: z.string().trim().min(1).optional(),
  videoClipS3Key: z.string().trim().min(1).optional(),
  voiceS3Key: z.string().trim().min(1).optional(),
  voiceDurationSec: z.number().positive().optional(),
  disableNarration: z.boolean().optional(),
  subtitle: z.string(),
  subtitleSegments: z.array(renderPlanSubtitleSegmentSchema).optional(),
  bgmMood: z.string().trim().min(1).optional(),
  sfx: z.array(z.string()).optional(),
  startTransition: sceneStartTransitionSchema.optional(),
});

export const renderPlanOverlayPlacementSchema = z.object({
  x: normalizedScalarSchema,
  y: normalizedScalarSchema,
  width: normalizedSizeSchema,
  height: normalizedSizeSchema,
});

export const renderPlanOverlayTimingSchema = z.object({
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
});

export const renderPlanImagePlacementSchema = z.object({
  x: normalizedScalarSchema,
  y: normalizedScalarSchema,
  width: normalizedSizeSchema,
  /** When omitted, Fargate derives pixel height from intrinsic aspect ratio and width. */
  height: normalizedSizeSchema.optional(),
});

export const renderPlanImageOverlaySchema = z
  .object({
    overlayId: z.string().trim().min(1),
    type: z.literal("image"),
    src: z.string().trim().min(1),
    placement: renderPlanImagePlacementSchema,
    opacity: z.number().min(0).max(1).optional(),
    zIndex: z.number().int().optional(),
    fit: z.enum(["contain", "cover", "stretch"]).optional(),
  })
  .merge(renderPlanOverlayTimingSchema);

export const renderPlanTextOverlayStyleSchema = z.object({
  fontFamily: z.string().trim().min(1),
  fontSize: z.number().positive(),
  fontWeight: z.enum(["regular", "bold"]).optional(),
  color: z.string().trim().min(1),
  opacity: z.number().min(0).max(1).optional(),
  strokeColor: z.string().trim().min(1).optional(),
  strokeWidth: z.number().min(0).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  /** 1 = single line (truncate with ellipsis if over width budget). Omit = wrap to multiple lines. */
  maxLines: z.number().int().min(1).max(20).optional(),
});

export const renderPlanTextOverlaySchema = z
  .object({
    overlayId: z.string().trim().min(1),
    type: z.literal("text"),
    text: z.string(),
    placement: renderPlanOverlayPlacementSchema,
    style: renderPlanTextOverlayStyleSchema,
    zIndex: z.number().int().optional(),
  })
  .merge(renderPlanOverlayTimingSchema);

export const renderPlanOverlaySchema = z.discriminatedUnion("type", [
  renderPlanImageOverlaySchema,
  renderPlanTextOverlaySchema,
]);

export const renderPlanSchema = z.object({
  renderEngine: z.literal("ffmpeg-fargate"),
  videoTitle: z.string(),
  language: z.string(),
  output: renderPlanOutputSchema,
  canvas: renderPlanCanvasSchema,
  mediaFrame: renderPlanMediaFrameSchema,
  preview: z.object({
    enabled: z.boolean(),
    maxDurationSec: z.number().positive(),
  }),
  subtitles: renderPlanSubtitleSchema,
  totalDurationSec: z.number().positive(),
  scenes: z.array(renderPlanSceneSchema),
  overlays: z.array(renderPlanOverlaySchema).default([]),
  soundtrackMood: z.string().trim().min(1).optional(),
  soundtrackSrc: z.string().trim().min(1).optional(),
  outputKey: z.string().trim().min(1),
  subtitleAssS3Key: z.string().trim().min(1).optional(),
});

export type RenderPlanOutput = z.infer<typeof renderPlanOutputSchema>;
export type RenderPlanCanvas = z.infer<typeof renderPlanCanvasSchema>;
export type RenderPlanMediaFrame = z.infer<typeof renderPlanMediaFrameSchema>;
export type RenderPlanSubtitleStyle = z.infer<
  typeof renderPlanSubtitleStyleSchema
>;
export type RenderPlanSubtitle = z.infer<typeof renderPlanSubtitleSchema>;
export type RenderPlanSubtitleSegment = z.infer<
  typeof renderPlanSubtitleSegmentSchema
>;
export type RenderPlanScene = z.infer<typeof renderPlanSceneSchema>;
export type RenderPlanOverlay = z.infer<typeof renderPlanOverlaySchema>;
export type RenderPlan = z.infer<typeof renderPlanSchema>;
