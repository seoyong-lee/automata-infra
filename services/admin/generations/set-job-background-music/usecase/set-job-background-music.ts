import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import { assertBackgroundMusicInput } from "../repo/assert-background-music-input";

export const setJobBackgroundMusic = async (input: {
  jobId: string;
  s3Key?: string;
}) => {
  await assertBackgroundMusicInput(input);

  await updateJobMeta(input.jobId, {
    backgroundMusicS3Key: input.s3Key ?? null,
  });

  return getJobDraftView(input.jobId);
};
