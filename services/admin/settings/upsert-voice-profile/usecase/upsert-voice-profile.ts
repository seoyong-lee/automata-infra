import { putVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { mapVoiceProfile } from "../../../shared/mapper/map-voice-profile";
import { mapUpsertVoiceProfileItem } from "../mapper/map-upsert-voice-profile-item";

export const upsertVoiceProfile = async (input: {
  actor: string;
  profileId: string;
  label: string;
  provider: string;
  voiceId: string;
  modelId?: string;
  sampleAudioUrl?: string;
  description?: string;
  language?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  isActive: boolean;
}) => {
  const item = await putVoiceProfile(mapUpsertVoiceProfileItem(input), input.actor);

  return mapVoiceProfile(item);
};
