import { badUserInput } from "../../../shared/errors";

export type ParsedSetSceneVoiceProfileArgs = {
  jobId: string;
  sceneId: number;
  profileId?: string;
};

const parseInputObject = (
  args: Record<string, unknown>,
): Record<string, unknown> => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  return input;
};

export const parseSetSceneVoiceProfileArgs = (
  args: Record<string, unknown>,
): ParsedSetSceneVoiceProfileArgs => {
  const input = parseInputObject(args);

  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  const sceneId =
    typeof input.sceneId === "number" && Number.isInteger(input.sceneId)
      ? input.sceneId
      : NaN;
  if (!jobId || !Number.isInteger(sceneId) || sceneId < 0) {
    throw badUserInput("jobId and sceneId are required");
  }

  const profileId =
    typeof input.profileId === "string" && input.profileId.trim().length > 0
      ? input.profileId.trim()
      : undefined;

  return {
    jobId,
    sceneId,
    ...(profileId ? { profileId } : {}),
  };
};
