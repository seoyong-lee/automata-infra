import { badUserInput } from "../../../shared/errors";

export type SelectSceneImageCandidateInputDto = {
  jobId: string;
  sceneId: number;
  candidateId: string;
};

export const parseSelectSceneImageCandidateArgs = (
  args: Record<string, unknown>,
): SelectSceneImageCandidateInputDto => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }

  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  const candidateId =
    typeof input.candidateId === "string" ? input.candidateId.trim() : "";
  const sceneId =
    typeof input.sceneId === "number" && Number.isInteger(input.sceneId)
      ? input.sceneId
      : NaN;

  if (!jobId || !candidateId || !Number.isInteger(sceneId) || sceneId < 0) {
    throw badUserInput("jobId, sceneId, and candidateId are required");
  }

  return { jobId, sceneId, candidateId };
};
