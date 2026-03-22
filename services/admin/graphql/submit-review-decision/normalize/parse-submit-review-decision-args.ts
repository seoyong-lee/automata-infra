import { submitReviewDecisionInputSchema } from "../../../../shared/lib/contracts/review-decision-schema";
import { badUserInput } from "../../shared/errors";

export const parseSubmitReviewDecisionArgs = (
  args: Record<string, unknown>,
) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : {};

  const raw = {
    jobId: typeof input.jobId === "string" ? input.jobId : "",
    action: typeof input.action === "string" ? input.action : "",
    regenerationScope:
      typeof input.regenerationScope === "string"
        ? input.regenerationScope
        : "full",
    targetSceneId:
      typeof input.targetSceneId === "number" &&
      Number.isInteger(input.targetSceneId)
        ? input.targetSceneId
        : undefined,
  };

  const parsed = submitReviewDecisionInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw badUserInput(msg);
  }

  return parsed.data;
};
