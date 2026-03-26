import { listVoiceProfiles as listVoiceProfileItems } from "../../../../shared/lib/store/voice-profiles";
import { mapVoiceProfile } from "../../../shared/mapper/map-voice-profile";

export const listVoiceProfiles = async () => {
  const items = await listVoiceProfileItems();
  return items.map(mapVoiceProfile);
};
