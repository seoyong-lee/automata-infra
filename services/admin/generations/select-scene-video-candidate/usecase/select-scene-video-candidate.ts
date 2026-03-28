import {
  getSceneVideoCandidate,
  putSceneVideoCandidate,
  upsertSceneAsset,
} from "../../../../shared/lib/store/video-jobs";
import { materializeRemoteVideoAsset } from "../../../../shared/lib/providers/media";
import { notFound } from "../../../shared/errors";
import { getJobDraft } from "../../../jobs/get-job-draft/repo/get-job-draft";

const resolveSelectedVideoS3Key = async (input: {
  jobId: string;
  sceneId: number;
  candidate: Awaited<ReturnType<typeof getSceneVideoCandidate>>;
}): Promise<string> => {
  const candidate = input.candidate;
  if (!candidate) {
    throw notFound("video candidate not found");
  }
  if (
    typeof candidate.videoClipS3Key === "string" &&
    candidate.videoClipS3Key.length > 0
  ) {
    return candidate.videoClipS3Key;
  }
  if (!candidate.sourceUrl) {
    throw new Error("video candidate source url not found");
  }
  const videoClipS3Key = await materializeRemoteVideoAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidateId: candidate.candidateId,
    sourceUrl: candidate.sourceUrl,
  });
  await putSceneVideoCandidate(
    input.jobId,
    input.sceneId,
    candidate.candidateId,
    {
      videoClipS3Key,
      createdAt: candidate.createdAt,
      provider: candidate.provider,
      providerLogS3Key: candidate.providerLogS3Key,
      promptHash: candidate.promptHash,
      mocked: candidate.mocked,
      sourceUrl: candidate.sourceUrl,
      thumbnailUrl: candidate.thumbnailUrl,
      authorName: candidate.authorName,
      sourceAssetId: candidate.sourceAssetId,
      width: candidate.width,
      height: candidate.height,
      durationSec: candidate.durationSec,
    },
  );
  return videoClipS3Key;
};

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
  const videoClipS3Key = await resolveSelectedVideoS3Key({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidate,
  });

  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoClipS3Key,
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
