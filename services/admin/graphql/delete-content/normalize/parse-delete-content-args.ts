import { badUserInput } from "../../shared/errors";

export const parseDeleteContentArgs = (
  args: Record<string, unknown>,
): { contentId: string } => {
  const contentId = args.contentId;
  if (typeof contentId !== "string" || contentId.trim().length === 0) {
    throw badUserInput("contentId is required");
  }
  return { contentId: contentId.trim() };
};
