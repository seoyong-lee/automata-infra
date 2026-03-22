import {
  type VoiceProfile,
  useSetJobDefaultVoiceProfileMutation,
  useSetSceneVoiceProfileMutation,
  useUpsertVoiceProfileMutation,
  useVoiceProfilesQuery,
} from '@packages/graphql';

export type { VoiceProfile };

export const useVoiceProfiles = useVoiceProfilesQuery;
export const useUpsertVoiceProfile = useUpsertVoiceProfileMutation;
export const useSetJobDefaultVoiceProfile = useSetJobDefaultVoiceProfileMutation;
export const useSetSceneVoiceProfile = useSetSceneVoiceProfileMutation;
