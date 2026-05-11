import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { assertMasterVideoInput } from "../repo/assert-master-video-input";

export const setJobMasterVideo = async (input: {
  jobId: string;
  s3Key?: string;
}) => {
  await assertMasterVideoInput(input);

  await updateJobMeta(input.jobId, {
    masterVideoS3Key: input.s3Key ?? null,
  });

  return getJobDraftView(input.jobId);
};
