import {
  getConfigTableName,
  getOptionalEnv,
  getItemFromTable,
  putItemToTable,
  queryItemsFromTable,
} from "../aws/runtime";

export type VoiceProfileItem = {
  PK: "VOICE_PROFILES";
  SK: `PROFILE#${string}`;
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
  updatedAt: string;
  updatedBy: string;
};

const VOICE_PROFILES_PK = "VOICE_PROFILES";

const hasConfigTable = (): boolean => {
  return Boolean(getOptionalEnv("CONFIG_TABLE_NAME"));
};

const profileSk = (profileId: string): `PROFILE#${string}` => {
  return `PROFILE#${profileId}`;
};

export const listVoiceProfiles = async (): Promise<VoiceProfileItem[]> => {
  if (!hasConfigTable()) {
    return [];
  }

  const items = await queryItemsFromTable<VoiceProfileItem>(getConfigTableName(), {
    keyConditionExpression: "PK = :pk",
    expressionAttributeValues: {
      ":pk": VOICE_PROFILES_PK,
    },
    scanIndexForward: true,
    limit: 200,
  });

  return items.sort((left, right) => left.label.localeCompare(right.label));
};

export const getVoiceProfile = async (
  profileId: string,
): Promise<VoiceProfileItem | null> => {
  if (!hasConfigTable()) {
    return null;
  }

  return getItemFromTable<VoiceProfileItem>(getConfigTableName(), {
    PK: VOICE_PROFILES_PK,
    SK: profileSk(profileId),
  });
};

export const putVoiceProfile = async (
  input: Omit<VoiceProfileItem, "PK" | "SK" | "updatedAt" | "updatedBy">,
  actor: string,
): Promise<VoiceProfileItem> => {
  const updatedAt = new Date().toISOString();
  const item: VoiceProfileItem = {
    PK: VOICE_PROFILES_PK,
    SK: profileSk(input.profileId),
    ...input,
    updatedAt,
    updatedBy: actor,
  };

  if (hasConfigTable()) {
    await putItemToTable(getConfigTableName(), item);
  }

  return item;
};
