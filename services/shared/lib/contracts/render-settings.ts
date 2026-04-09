import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#?[0-9A-Fa-f]{6}$/, "Expected a 6-digit hex color")
  .transform((value) =>
    value.startsWith("#") ? value.toUpperCase() : `#${value.toUpperCase()}`,
  );

export const subtitleFontPresetSchema = z.enum([
  "default",
  "serif",
  "sans",
  "display",
]);

export const subtitleFontWeightSchema = z.enum(["regular", "bold"]);
export const subtitleOffsetScalarSchema = z.number().min(-1).max(1);
export const videoCropModeSchema = z.enum(["contain", "cover", "smart-crop"]);
export const normalizedFrameScalarSchema = z.number().min(0).max(1);
export const normalizedOverlayWidthSchema = z.number().min(0.2).max(1);

export const jobRenderTextOverlaySchema = z
  .object({
    overlayId: nonEmpty,
    text: z.string().max(200),
    x: normalizedFrameScalarSchema,
    y: normalizedFrameScalarSchema,
    width: normalizedOverlayWidthSchema.optional(),
    fontPreset: subtitleFontPresetSchema.optional(),
    fontWeight: subtitleFontWeightSchema.optional(),
    fontSize: z.number().int().min(12).max(96).optional(),
    color: hexColorSchema.optional(),
    maxLines: z.number().int().min(1).max(20).optional(),
  })
  .strict();

/** Normalized width/height of the overlay box on the full output frame (not the video inset). */
const overlayBoxScalarSchema = z.number().min(0.01).max(1);

export const jobRenderImageOverlaySchema = z
  .object({
    overlayId: nonEmpty,
    /** S3 object key (same bucket as job assets). */
    src: z.string().trim().min(1).max(512),
    x: normalizedFrameScalarSchema,
    y: normalizedFrameScalarSchema,
    width: overlayBoxScalarSchema,
    /** Omit to preserve intrinsic aspect ratio for the given normalized width. */
    height: overlayBoxScalarSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    fit: z.enum(["contain", "cover", "stretch"]).optional(),
    zIndex: z.number().int().optional(),
    startSec: z.number().min(0).optional(),
    endSec: z.number().min(0).optional(),
  })
  .strict();

export const jobRenderSettingsSchema = z
  .object({
    subtitleEnabled: z.boolean().optional(),
    subtitleStylePreset: nonEmpty.optional(),
    subtitlePosition: z.enum(["top", "center", "bottom"]).optional(),
    subtitleOffsetY: subtitleOffsetScalarSchema.optional(),
    subtitleFontPreset: subtitleFontPresetSchema.optional(),
    subtitleFontWeight: subtitleFontWeightSchema.optional(),
    subtitleFontSize: z.number().int().min(12).max(96).optional(),
    subtitleMaxWidth: normalizedOverlayWidthSchema.optional(),
    subtitleColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),
    videoScale: z.number().min(0.5).max(1.25).optional(),
    videoCropMode: videoCropModeSchema.optional(),
    videoFrameX: normalizedFrameScalarSchema.optional(),
    videoFrameY: normalizedFrameScalarSchema.optional(),
    videoFrameWidth: z.number().min(0.1).max(1).optional(),
    videoFrameHeight: z.number().min(0.1).max(1).optional(),
    textOverlays: z.array(jobRenderTextOverlaySchema).max(12).optional(),
    imageOverlays: z.array(jobRenderImageOverlaySchema).max(12).optional(),
  })
  .strict();

export type JobRenderTextOverlay = z.infer<typeof jobRenderTextOverlaySchema>;
export type JobRenderImageOverlay = z.infer<typeof jobRenderImageOverlaySchema>;
export type JobRenderSettings = z.infer<typeof jobRenderSettingsSchema>;
