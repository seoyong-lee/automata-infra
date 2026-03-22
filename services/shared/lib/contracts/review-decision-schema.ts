import { z } from "zod";

const assetRegenerationScopes = new Set(["image", "video", "voice"]);

export const submitReviewDecisionInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    action: z
      .string()
      .trim()
      .min(1)
      .transform((s) => s.toLowerCase())
      .pipe(z.enum(["approve", "reject", "regenerate"])),
    regenerationScope: z
      .string()
      .trim()
      .min(1)
      .default("full")
      .transform((s) => s.toLowerCase()),
    targetSceneId: z.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "regenerate" && assetRegenerationScopes.has(data.regenerationScope)) {
      if (data.targetSceneId === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "targetSceneId is required when action is regenerate and regenerationScope is image, video, or voice",
          path: ["targetSceneId"],
        });
      }
    }
  });

export type SubmitReviewDecisionInput = z.infer<
  typeof submitReviewDecisionInputSchema
>;
