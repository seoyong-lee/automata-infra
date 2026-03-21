import { badUserInput } from "../../shared/errors";

export type EnqueueToChannelPublishQueueInputDto = {
  contentId: string;
  jobId: string;
  note?: string;
};

export const parseEnqueueToChannelPublishQueueArgs = (
  args: Record<string, unknown>,
): EnqueueToChannelPublishQueueInputDto => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const contentId =
    typeof input.contentId === "string" ? input.contentId.trim() : "";
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!contentId || !jobId) {
    throw badUserInput("contentId and jobId are required");
  }
  const noteRaw = input.note;
  const note =
    typeof noteRaw === "string" && noteRaw.trim().length > 0
      ? noteRaw.trim()
      : undefined;
  return { contentId, jobId, note };
};
