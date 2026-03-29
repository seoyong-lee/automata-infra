import { getVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";

export const setSceneVoiceProfile = async (input: {
  jobId: string;
  sceneId: number;
  profileId?: string;
}) => {
  if (input.profileId) {
    const profile = await getVoiceProfile(input.profileId);
    if (!profile) {
      throw notFound("voice profile not found");
    }
  }

  await upsertSceneAsset(input.jobId, input.sceneId, {
    voiceProfileId: input.profileId ?? null,
  });

  return getJobDraftView(input.jobId);
};
