import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime-s3";
import { getSceneAsset, upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../../admin/shared/usecase/get-job-draft-view";
import { badUserInput, notFound } from "../../../../admin/shared/errors";
import { getJobOrThrow } from "../../../../admin/shared/repo/job-draft-store";
import type { CompleteSceneImageUploadInput } from "../../../../shared/lib/contracts/scene-manual-asset-upload";

const IMAGE_EXTENSION_RE = /\.(png|jpg|jpeg|webp)$/i;

const assertSceneImageKeyMatches = (input: {
  jobId: string;
  sceneId: number;
  s3Key: string;
}) => {
  const expectedPrefix = `assets/${input.jobId}/manual/image/scene-${input.sceneId}/`;
  if (!input.s3Key.startsWith(expectedPrefix)) {
    throw badUserInput(
      "s3Key must point to an uploaded scene image for the selected job and scene",
    );
  }
  if (!IMAGE_EXTENSION_RE.test(input.s3Key)) {
    throw badUserInput("scene image must be .png, .jpg, .jpeg, or .webp");
  }
};

export const completeSceneImageUpload = async (
  input: CompleteSceneImageUploadInput,
) => {
  await getJobOrThrow(input.jobId);
  const existingSceneAsset = await getSceneAsset(input.jobId, input.sceneId);
  if (!existingSceneAsset) {
    throw notFound("scene asset not found");
  }

  assertSceneImageKeyMatches(input);
  const objectHead = await headObjectFromS3(input.s3Key);
  if (!objectHead.exists) {
    throw badUserInput("uploaded scene image not found");
  }
  if (!objectHead.contentType?.toLowerCase().startsWith("image/")) {
    throw badUserInput("s3Key must point to an image/* object");
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    imageS3Key: input.s3Key,
    imageSelectedCandidateId: null,
  });

  return getJobDraftView(input.jobId);
};
