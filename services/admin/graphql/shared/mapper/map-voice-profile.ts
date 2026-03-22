import type { VoiceProfileItem } from "../../../../shared/lib/store/voice-profiles";
import type { VoiceProfileDto } from "../types";

export const mapVoiceProfile = (profile: VoiceProfileItem): VoiceProfileDto => {
  return {
    profileId: profile.profileId,
    label: profile.label,
    provider: profile.provider,
    voiceId: profile.voiceId,
    modelId: profile.modelId,
    sampleAudioUrl: profile.sampleAudioUrl,
    description: profile.description,
    language: profile.language,
    speed: profile.speed,
    stability: profile.stability,
    similarityBoost: profile.similarityBoost,
    style: profile.style,
    useSpeakerBoost: profile.useSpeakerBoost,
    isActive: profile.isActive,
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy,
  };
};
