import { getVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../shared/errors";
import { getJobDraft } from "../../get-job-draft/repo/get-job-draft";

export const setJobDefaultVoiceProfile = async (input: {
  jobId: string;
  profileId?: string;
}) => {
  if (input.profileId) {
    const profile = await getVoiceProfile(input.profileId);
    if (!profile) {
      throw notFound("voice profile not found");
    }
  }

  await updateJobMeta(input.jobId, {
    defaultVoiceProfileId: input.profileId ?? null,
  });

  return getJobDraft(input.jobId);
};
