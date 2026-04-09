import type { SceneDefinition } from "../../../types/render/scene-json";
import { getContentPreset } from "../../shared/lib/store/content-presets";
import { getVoiceProfile } from "../../shared/lib/store/voice-profiles";
import {
  listSceneAssets,
  type JobMetaItem,
  type SceneAssetItem,
} from "../../shared/lib/store/video-jobs";
import type { ElevenLabsVoiceSettings } from "../../shared/lib/providers/media/elevenlabs-voice";

/** Scene JSON / Step 이벤트에서 오는 최소 필드 */
export type VoiceSceneSource = Pick<
  SceneDefinition,
  "sceneId" | "narration" | "disableNarration" | "durationSec"
>;

export type VoiceGenerationScene = VoiceSceneSource & {
  voiceProfileId?: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
};

type VoiceProfile = NonNullable<Awaited<ReturnType<typeof getVoiceProfile>>>;

const resolveNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const buildSceneAssetMap = (
  sceneAssets: SceneAssetItem[],
): Map<number, SceneAssetItem> => {
  return new Map(sceneAssets.map((asset) => [asset.sceneId, asset]));
};

const resolveVoiceProfileId = (input: {
  runOverrideProfileId?: string;
  sceneId: number;
  sceneAssetMap: Map<number, SceneAssetItem>;
  defaultVoiceProfileId?: string;
  presetPreferredVoiceProfileId?: string;
}): string | undefined => {
  const fromRun = resolveNonEmptyString(input.runOverrideProfileId);
  if (fromRun) {
    return fromRun;
  }
  const fromScene = resolveNonEmptyString(
    input.sceneAssetMap.get(input.sceneId)?.voiceProfileId,
  );
  if (fromScene) {
    return fromScene;
  }
  const fromJob = resolveNonEmptyString(input.defaultVoiceProfileId);
  if (fromJob) {
    return fromJob;
  }
  return resolveNonEmptyString(input.presetPreferredVoiceProfileId);
};

const buildVoiceSettings = (profile: VoiceProfile | null) => ({
  ...(typeof profile?.speed === "number" ? { speed: profile.speed } : {}),
  ...(typeof profile?.stability === "number"
    ? { stability: profile.stability }
    : {}),
  ...(typeof profile?.similarityBoost === "number"
    ? { similarityBoost: profile.similarityBoost }
    : {}),
  ...(typeof profile?.style === "number" ? { style: profile.style } : {}),
  ...(typeof profile?.useSpeakerBoost === "boolean"
    ? { useSpeakerBoost: profile.useSpeakerBoost }
    : {}),
});

const resolveTargetDurationSec = (
  scene: Pick<VoiceSceneSource, "sceneId" | "durationSec">,
  sceneAssetMap: Map<number, SceneAssetItem>,
): number => {
  const jsonDur =
    typeof scene.durationSec === "number" && Number.isFinite(scene.durationSec)
      ? scene.durationSec
      : 0;
  const asset = sceneAssetMap.get(scene.sceneId);
  const storedDur =
    typeof asset?.durationSec === "number" && Number.isFinite(asset.durationSec)
      ? asset.durationSec
      : 0;
  const merged = Math.max(jsonDur, storedDur);
  return merged > 0 ? merged : jsonDur;
};

const buildOneVoiceScene = async (input: {
  scene: VoiceSceneSource;
  sceneAssetMap: Map<number, SceneAssetItem>;
  runVoiceProfileIdOverride?: string;
  defaultVoiceProfileId?: string;
  presetPreferredVoiceProfileId?: string;
}): Promise<VoiceGenerationScene> => {
  const selectedProfileId = resolveVoiceProfileId({
    runOverrideProfileId: input.runVoiceProfileIdOverride,
    sceneId: input.scene.sceneId,
    sceneAssetMap: input.sceneAssetMap,
    defaultVoiceProfileId: input.defaultVoiceProfileId,
    presetPreferredVoiceProfileId: input.presetPreferredVoiceProfileId,
  });
  const selectedProfile = selectedProfileId
    ? await getVoiceProfile(selectedProfileId)
    : null;
  if (selectedProfileId && !selectedProfile) {
    throw new Error(`voice profile not found: ${selectedProfileId}`);
  }

  return {
    sceneId: input.scene.sceneId,
    narration: input.scene.narration,
    disableNarration: input.scene.disableNarration,
    durationSec: resolveTargetDurationSec(input.scene, input.sceneAssetMap),
    /** 씬/잡/프리셋에서 해석된 프로필 id(저장·로그와 동일해야 함) */
    voiceProfileId: selectedProfile ? selectedProfileId : undefined,
    voiceId: resolveNonEmptyString(selectedProfile?.voiceId),
    modelId: resolveNonEmptyString(selectedProfile?.modelId),
    voiceSettings: buildVoiceSettings(selectedProfile),
  };
};

export const buildVoiceScenesForJob = async (input: {
  jobId: string;
  job: JobMetaItem;
  scenes: VoiceSceneSource[];
  /** `runAssetGeneration` 등에서 전달 시 씬·잡 기본 프로필보다 우선 */
  runVoiceProfileIdOverride?: string;
}): Promise<VoiceGenerationScene[]> => {
  const sceneAssetMap = buildSceneAssetMap(await listSceneAssets(input.jobId));

  let presetPreferredVoiceProfileId: string | undefined;
  const presetId = input.job.presetId?.trim();
  if (presetId) {
    const preset = await getContentPreset(presetId);
    presetPreferredVoiceProfileId = resolveNonEmptyString(
      preset?.defaultPolicy?.preferredVoiceProfileId,
    );
  }

  return Promise.all(
    input.scenes.map((scene) =>
      buildOneVoiceScene({
        scene,
        sceneAssetMap,
        runVoiceProfileIdOverride: input.runVoiceProfileIdOverride,
        defaultVoiceProfileId: input.job.defaultVoiceProfileId,
        presetPreferredVoiceProfileId,
      }),
    ),
  );
};
