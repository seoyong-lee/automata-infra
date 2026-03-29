import {
  type SceneVideoCandidateItem,
  putSceneVideoCandidate,
} from "../../../../shared/lib/store/video-jobs";
import { materializeRemoteVideoAsset } from "../../../../shared/lib/providers/media";
import { notFound } from "../../../shared/errors";

export const resolveSelectedVideoS3Key = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneVideoCandidateItem | null;
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
