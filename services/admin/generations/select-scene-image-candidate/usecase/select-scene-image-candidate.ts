import {
  getSceneImageCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraft } from "../../../jobs/get-job-draft/repo/get-job-draft";

export const selectSceneImageCandidateUsecase = async (input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
}) => {
  const candidate = await getSceneImageCandidate(
    input.jobId,
    input.sceneId,
    input.candidateId,
  );
  if (!candidate) {
    throw notFound("image candidate not found");
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    imageS3Key: candidate.imageS3Key,
    imageProvider: candidate.provider,
    imageProviderLogS3Key: candidate.providerLogS3Key,
    imagePromptHash: candidate.promptHash,
    imageMocked: candidate.mocked,
    imageSelectedCandidateId: candidate.candidateId,
    imageSelectedAt: candidate.createdAt,
  });

  return getJobDraft(input.jobId);
};
