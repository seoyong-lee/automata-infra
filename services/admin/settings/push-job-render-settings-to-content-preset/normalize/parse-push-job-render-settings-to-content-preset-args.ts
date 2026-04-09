import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const inputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    presetId: z.string().trim().min(1).optional().nullable(),
  })
  .strict();

export type PushJobRenderSettingsToContentPresetArgs = z.infer<
  typeof inputSchema
>;

export const parsePushJobRenderSettingsToContentPresetArgs = (
  args: Record<string, unknown>,
): PushJobRenderSettingsToContentPresetArgs => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw badUserInput(
      parsed.error.issues[0]?.message ??
        "pushJobRenderSettingsToContentPreset input is invalid",
    );
  }
  return parsed.data;
};
