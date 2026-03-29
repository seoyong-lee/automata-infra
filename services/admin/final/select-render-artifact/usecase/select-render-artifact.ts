import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import {
  getJobOrThrow,
  listStoredFinalRenderArtifactItems,
} from "../../../shared/repo/job-draft-store";
import { notFound } from "../../../shared/errors";
import { getAdminJobDraft } from "../../../jobs/get-job-draft/usecase/get-job-draft";

export const selectRenderArtifactUsecase = async (input: {
  jobId: string;
  createdAt: string;
}) => {
  await getJobOrThrow(input.jobId);
  const artifacts = await listStoredFinalRenderArtifactItems(input.jobId);
  const selected = artifacts.find((artifact) => artifact.createdAt === input.createdAt);
  if (!selected) {
    throw notFound("render artifact not found");
  }
  if (
    !selected.finalVideoS3Key ||
    !selected.thumbnailS3Key ||
    !selected.previewS3Key
  ) {
    throw notFound("render artifact is incomplete");
  }

  await updateJobMeta(
    input.jobId,
    {
      finalVideoS3Key: selected.finalVideoS3Key,
      thumbnailS3Key: selected.thumbnailS3Key,
      previewS3Key: selected.previewS3Key,
      ...(selected.renderPlanS3Key
        ? { renderPlanS3Key: selected.renderPlanS3Key }
        : {}),
      lastError: null,
    },
    "RENDERED",
  );

  return getAdminJobDraft(input.jobId);
};
