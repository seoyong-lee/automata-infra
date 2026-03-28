import {
  getConfigTableName,
  getItemFromTable,
  getOptionalEnv,
  putItemToTable,
  queryItemsFromTable,
} from "../aws/runtime";
import {
  type ContentPreset,
  type ContentPresetAssetStrategy,
  type ContentPresetCapabilities,
  parseContentPreset,
} from "../contracts/content-presets";

type ContentPresetItem = ContentPreset & {
  PK: "CONTENT_PRESETS";
  SK: `PRESET#${string}`;
};

const CONTENT_PRESETS_PK = "CONTENT_PRESETS";
const BUILTIN_TIMESTAMP = "2026-03-28T00:00:00.000Z";

const presetSk = (presetId: string): `PRESET#${string}` => {
  return `PRESET#${presetId}`;
};

const hasConfigTable = (): boolean => {
  return Boolean(getOptionalEnv("CONFIG_TABLE_NAME"));
};

const withDefaults = (
  input: Omit<ContentPreset, "createdAt" | "updatedAt">,
) => {
  return parseContentPreset({
    ...input,
    createdAt: BUILTIN_TIMESTAMP,
    updatedAt: BUILTIN_TIMESTAMP,
  });
};

const createCapabilities = (
  input: Partial<ContentPresetCapabilities> &
    Pick<
      ContentPresetCapabilities,
      "voiceMode" | "subtitleMode" | "layoutMode"
    >,
): ContentPresetCapabilities => {
  return {
    voiceMode: input.voiceMode,
    subtitleMode: input.subtitleMode,
    layoutMode: input.layoutMode,
    supportsAiVideo: input.supportsAiVideo ?? false,
    supportsAiImage: input.supportsAiImage ?? false,
    supportsStockVideo: input.supportsStockVideo ?? false,
    supportsStockImage: input.supportsStockImage ?? false,
    supportsBgm: input.supportsBgm ?? true,
    supportsSfx: input.supportsSfx ?? false,
    supportsVoiceProfile: input.supportsVoiceProfile ?? false,
    supportsOverlayTemplate: input.supportsOverlayTemplate ?? false,
  };
};

const createBuiltInPreset = (input: {
  presetId: string;
  name: string;
  description: string;
  format: ContentPreset["format"];
  styleTags: ContentPreset["styleTags"];
  assetStrategy: ContentPresetAssetStrategy;
  capabilities: ContentPresetCapabilities;
  stylePreset: string;
  platformPresets?: ContentPreset["platformPresets"];
  duration?: ContentPreset["duration"];
  defaultPolicy?: Partial<ContentPreset["defaultPolicy"]>;
}): ContentPreset =>
  withDefaults({
    presetId: input.presetId,
    name: input.name,
    description: input.description,
    isActive: true,
    format: input.format,
    duration: input.duration ?? "short",
    platformPresets: input.platformPresets ?? ["tiktok-reels-shorts", "9:16"],
    styleTags: input.styleTags,
    assetStrategy: input.assetStrategy,
    capabilities: input.capabilities,
    defaultPolicy: {
      stylePreset: input.stylePreset,
      sceneCountMin: input.defaultPolicy?.sceneCountMin,
      sceneCountMax: input.defaultPolicy?.sceneCountMax,
      subtitleStylePreset: input.defaultPolicy?.subtitleStylePreset,
      renderPreset: input.defaultPolicy?.renderPreset,
      preferredImageProvider: input.defaultPolicy?.preferredImageProvider,
      preferredVideoProvider: input.defaultPolicy?.preferredVideoProvider,
      preferredVoiceProfileId: input.defaultPolicy?.preferredVoiceProfileId,
    },
  });

export const BUILTIN_CONTENT_PRESETS: ContentPreset[] = [
  createBuiltInPreset({
    presetId: "generative-horror-story",
    name: "Generative Horror Story",
    description: "생성형 비주얼과 내레이션 중심의 공포 스토리 숏폼",
    format: "generative-video",
    styleTags: ["cinematic", "horror", "dramatic"],
    assetStrategy: "mixed",
    capabilities: createCapabilities({
      voiceMode: "required",
      subtitleMode: "required",
      layoutMode: "free-scene",
      supportsAiVideo: true,
      supportsAiImage: true,
      supportsStockVideo: true,
      supportsStockImage: true,
      supportsBgm: true,
      supportsSfx: true,
      supportsVoiceProfile: true,
    }),
    stylePreset: "cinematic_horror_story",
    defaultPolicy: {
      sceneCountMin: 4,
      sceneCountMax: 7,
      renderPreset: "shorts-9x16",
      preferredImageProvider: "byteplus",
      preferredVideoProvider: "byteplus",
    },
  }),
  createBuiltInPreset({
    presetId: "news-bold-caption-short",
    name: "News Bold Caption Short",
    description: "자막과 카드 레이아웃이 중심인 뉴스형 템플릿 숏폼",
    format: "template-short",
    styleTags: ["news", "bold-caption", "minimal"],
    assetStrategy: "mixed",
    capabilities: createCapabilities({
      voiceMode: "required",
      subtitleMode: "required",
      layoutMode: "template",
      supportsAiImage: true,
      supportsStockImage: true,
      supportsStockVideo: true,
      supportsBgm: true,
      supportsOverlayTemplate: true,
      supportsVoiceProfile: true,
    }),
    stylePreset: "news_bold_caption",
    defaultPolicy: {
      sceneCountMin: 4,
      sceneCountMax: 6,
      subtitleStylePreset: "bold-caption-news",
      renderPreset: "shorts-template",
    },
  }),
  createBuiltInPreset({
    presetId: "still-motion-quote",
    name: "Still Motion Quote",
    description: "정지 이미지와 텍스트 애니메이션 중심의 저비용 숏폼",
    format: "still-motion-short",
    styleTags: ["minimal", "aesthetic"],
    assetStrategy: "ai-image",
    capabilities: createCapabilities({
      voiceMode: "optional",
      subtitleMode: "required",
      layoutMode: "still-motion",
      supportsAiImage: true,
      supportsStockImage: true,
      supportsBgm: true,
      supportsOverlayTemplate: true,
    }),
    stylePreset: "still_motion_quote",
    defaultPolicy: {
      sceneCountMin: 4,
      sceneCountMax: 8,
      subtitleStylePreset: "minimal-quote",
      renderPreset: "still-motion-9x16",
      preferredImageProvider: "openai",
    },
  }),
  createBuiltInPreset({
    presetId: "narrated-documentary-short",
    name: "Narrated Documentary Short",
    description: "보이스오버 중심의 설명형 다큐 숏폼",
    format: "narrated-explainer",
    styleTags: ["documentary", "cinematic"],
    assetStrategy: "mixed",
    capabilities: createCapabilities({
      voiceMode: "required",
      subtitleMode: "required",
      layoutMode: "free-scene",
      supportsAiImage: true,
      supportsAiVideo: true,
      supportsStockImage: true,
      supportsStockVideo: true,
      supportsBgm: true,
      supportsVoiceProfile: true,
    }),
    stylePreset: "documentary_voiceover",
    defaultPolicy: {
      sceneCountMin: 4,
      sceneCountMax: 7,
      renderPreset: "narrated-doc-short",
      preferredImageProvider: "openai",
      preferredVideoProvider: "runway",
    },
  }),
  createBuiltInPreset({
    presetId: "cinematic-ambient-visual",
    name: "Cinematic Ambient Visual",
    description: "무드와 비주얼 중심의 시네마틱 영상",
    format: "cinematic-visual",
    styleTags: ["cinematic", "aesthetic"],
    assetStrategy: "mixed",
    capabilities: createCapabilities({
      voiceMode: "disabled",
      subtitleMode: "minimal",
      layoutMode: "cinematic",
      supportsAiVideo: true,
      supportsAiImage: true,
      supportsStockVideo: true,
      supportsStockImage: true,
      supportsBgm: true,
      supportsSfx: true,
    }),
    stylePreset: "cinematic_ambient_visual",
    defaultPolicy: {
      sceneCountMin: 3,
      sceneCountMax: 6,
      renderPreset: "cinematic-visual-short",
      preferredVideoProvider: "runway",
    },
  }),
];

const BUILTIN_PRESET_MAP = new Map(
  BUILTIN_CONTENT_PRESETS.map((preset) => [preset.presetId, preset]),
);

const mapPresetItem = (item: ContentPresetItem): ContentPreset => {
  return parseContentPreset({
    presetId: item.presetId,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    format: item.format,
    duration: item.duration,
    platformPresets: item.platformPresets,
    styleTags: item.styleTags,
    assetStrategy: item.assetStrategy,
    capabilities: item.capabilities,
    defaultPolicy: item.defaultPolicy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
};

export const listContentPresets = async (input?: {
  includeInactive?: boolean;
}): Promise<ContentPreset[]> => {
  if (!hasConfigTable()) {
    return input?.includeInactive
      ? BUILTIN_CONTENT_PRESETS
      : BUILTIN_CONTENT_PRESETS.filter((preset) => preset.isActive);
  }

  const configured = await queryItemsFromTable<ContentPresetItem>(
    getConfigTableName(),
    {
      keyConditionExpression: "PK = :pk",
      expressionAttributeValues: {
        ":pk": CONTENT_PRESETS_PK,
      },
      scanIndexForward: true,
      limit: 200,
    },
  );

  const merged = new Map(BUILTIN_PRESET_MAP);
  for (const item of configured) {
    const mapped = mapPresetItem(item);
    merged.set(mapped.presetId, mapped);
  }

  return Array.from(merged.values())
    .filter((preset) => input?.includeInactive || preset.isActive)
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getContentPreset = async (
  presetId: string,
): Promise<ContentPreset | null> => {
  if (hasConfigTable()) {
    const item = await getItemFromTable<ContentPresetItem>(
      getConfigTableName(),
      {
        PK: CONTENT_PRESETS_PK,
        SK: presetSk(presetId),
      },
    );
    if (item) {
      return mapPresetItem(item);
    }
  }

  return BUILTIN_PRESET_MAP.get(presetId) ?? null;
};

export const getContentPresetOrThrow = async (
  presetId: string,
): Promise<ContentPreset> => {
  const preset = await getContentPreset(presetId);
  if (!preset) {
    throw new Error(`content preset not found: ${presetId}`);
  }
  if (!preset.isActive) {
    throw new Error(`content preset is inactive: ${presetId}`);
  }
  return preset;
};

export const putContentPreset = async (input: {
  preset: Omit<ContentPreset, "createdAt" | "updatedAt">;
}): Promise<ContentPreset> => {
  const now = new Date().toISOString();
  const existing = input.preset.presetId
    ? await getContentPreset(input.preset.presetId)
    : null;
  const item: ContentPresetItem = {
    PK: CONTENT_PRESETS_PK,
    SK: presetSk(input.preset.presetId),
    ...input.preset,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (hasConfigTable()) {
    await putItemToTable(getConfigTableName(), item);
  }

  return mapPresetItem(item);
};

export const softDeleteContentPreset = async (
  presetId: string,
): Promise<ContentPreset> => {
  const existing = await getContentPresetOrThrow(presetId);
  return putContentPreset({
    preset: {
      presetId: existing.presetId,
      name: existing.name,
      description: existing.description,
      isActive: false,
      format: existing.format,
      duration: existing.duration,
      platformPresets: existing.platformPresets,
      styleTags: existing.styleTags,
      assetStrategy: existing.assetStrategy,
      capabilities: existing.capabilities,
      defaultPolicy: existing.defaultPolicy,
    },
  });
};
