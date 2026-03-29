import { getVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { notFound } from "../../../shared/errors";

export const assertVoiceProfileExists = async (profileId?: string) => {
  if (!profileId) {
    return;
  }
  const profile = await getVoiceProfile(profileId);
  if (!profile) {
    throw notFound("voice profile not found");
  }
};
