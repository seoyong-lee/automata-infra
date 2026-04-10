import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

export const suggestJobYoutubePublishMetadataInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    outputLocaleHint: z.string().trim().min(1).optional(),
  })
  .strict();

export type SuggestJobYoutubePublishMetadataInput = z.infer<
  typeof suggestJobYoutubePublishMetadataInputSchema
>;

export const parseSuggestJobYoutubePublishMetadataArgs = (
  args: Record<string, unknown>,
): SuggestJobYoutubePublishMetadataInput => {
  const raw = args.input;
  if (!raw || typeof raw !== "object") {
    throw badUserInput("input is required");
  }
  const parsed = suggestJobYoutubePublishMetadataInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw badUserInput(parsed.error.flatten().formErrors.join("; "));
  }
  return parsed.data;
};
