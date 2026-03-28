import {
  getSceneVideoCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraft } from "../../../jobs/get-job-draft/repo/get-job-draft";

export const selectSceneVideoCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  const candidate = await getSceneVideoCandidate(
    input.jobId,
    input.sceneId,
    input.candidateId,
  );
  if (!candidate) {
    throw notFound("video candidate not found");
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoClipS3Key: candidate.videoClipS3Key,
    videoProvider: candidate.provider,
    videoProviderLogS3Key: candidate.providerLogS3Key,
    videoPromptHash: candidate.promptHash,
    videoMocked: candidate.mocked,
    videoSelectedCandidateId: candidate.candidateId,
    videoSelectedAt: candidate.createdAt,
    ...(typeof candidate.durationSec === "number"
      ? { videoResolvedDurationSec: candidate.durationSec }
      : {}),
  });

  return getJobDraft(input.jobId);
};
