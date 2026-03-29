import { upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import { assertVoiceProfileExists } from "../../shared/repo/assert-voice-profile-exists";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";

export const setSceneVoiceProfile = async (input: {
  jobId: string;
  sceneId: number;
  profileId?: string;
}) => {
  await assertVoiceProfileExists(input.profileId);

  await upsertSceneAsset(input.jobId, input.sceneId, {
    voiceProfileId: input.profileId ?? null,
  });

  return getJobDraftView(input.jobId);
};
