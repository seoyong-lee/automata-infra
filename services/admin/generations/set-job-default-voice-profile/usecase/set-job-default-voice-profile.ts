import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { assertVoiceProfileExists } from "../../shared/repo/assert-voice-profile-exists";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";

export const setJobDefaultVoiceProfile = async (input: {
  jobId: string;
  profileId?: string;
}) => {
  await assertVoiceProfileExists(input.profileId);

  await updateJobMeta(input.jobId, {
    defaultVoiceProfileId: input.profileId ?? null,
  });

  return getJobDraftView(input.jobId);
};
