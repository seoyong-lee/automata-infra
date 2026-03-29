import {
  type SceneImageCandidateItem,
  putSceneImageCandidate,
} from "../../../../shared/lib/store/video-jobs";
import { materializeRemoteImageAsset } from "../../../../shared/lib/providers/media";
import { notFound } from "../../../shared/errors";

export const resolveSelectedImageS3Key = async (input: {
  jobId: string;
  sceneId: number;
  candidate: SceneImageCandidateItem | null;
}): Promise<string> => {
  const candidate = input.candidate;
  if (!candidate) {
    throw notFound("image candidate not found");
  }
  if (
    typeof candidate.imageS3Key === "string" &&
    candidate.imageS3Key.length > 0
  ) {
    return candidate.imageS3Key;
  }
  if (!candidate.sourceUrl) {
    throw new Error("image candidate source url not found");
  }
  const imageS3Key = await materializeRemoteImageAsset({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidateId: candidate.candidateId,
    sourceUrl: candidate.sourceUrl,
  });
  await putSceneImageCandidate(
    input.jobId,
    input.sceneId,
    candidate.candidateId,
    {
      imageS3Key,
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
    },
  );
  return imageS3Key;
};
