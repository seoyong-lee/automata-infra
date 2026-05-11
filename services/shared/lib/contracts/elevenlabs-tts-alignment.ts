import { z } from "zod";

/** ElevenLabs `alignment` / `normalized_alignment` block. */
export const elevenLabsCharAlignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number()),
  character_end_times_seconds: z.array(z.number()),
});

export type ElevenLabsCharAlignment = z.infer<
  typeof elevenLabsCharAlignmentSchema
>;

/** Raw JSON from POST .../with-timestamps (subset). */
export const elevenLabsWithTimestampsResponseSchema = z.object({
  audio_base64: z.string().min(1),
  alignment: elevenLabsCharAlignmentSchema.optional(),
  normalized_alignment: elevenLabsCharAlignmentSchema.optional(),
});

export type ElevenLabsWithTimestampsResponse = z.infer<
  typeof elevenLabsWithTimestampsResponseSchema
>;

/** Persisted to S3 under `voiceAlignmentS3Key` (vendor fields + optional source text). */
export const elevenLabsStoredAlignmentDocumentSchema = z.object({
  alignment: elevenLabsCharAlignmentSchema.optional(),
  normalized_alignment: elevenLabsCharAlignmentSchema.optional(),
  sourceText: z.string().optional(),
});

export type ElevenLabsStoredAlignmentDocument = z.infer<
  typeof elevenLabsStoredAlignmentDocumentSchema
>;

const isConsistentAlignment = (
  a: ElevenLabsCharAlignment | undefined,
): a is ElevenLabsCharAlignment => {
  if (!a?.characters?.length) {
    return false;
  }
  const n = a.characters.length;
  return (
    a.character_start_times_seconds.length === n &&
    a.character_end_times_seconds.length === n
  );
};

/** Prefer `normalized_alignment` when structurally valid (matches subtitle pipeline text more often). */
export const resolveElevenLabsCharAlignment = (
  doc: ElevenLabsStoredAlignmentDocument,
): ElevenLabsCharAlignment | undefined => {
  if (isConsistentAlignment(doc.normalized_alignment)) {
    return doc.normalized_alignment;
  }
  if (isConsistentAlignment(doc.alignment)) {
    return doc.alignment;
  }
  return undefined;
};
