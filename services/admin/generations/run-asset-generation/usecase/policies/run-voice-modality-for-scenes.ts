import { listSceneAssets } from "../../../../../shared/lib/store/video-jobs";
import { getVoiceProfile } from "../../../../../shared/lib/store/voice-profiles";
import { generateSceneVoices } from "../../../../../voice/usecase/generate-scene-voices";
import { saveVoiceAssets } from "../../../../../voice/repo/save-voice-assets";
import { getJobOrThrow } from "../../../../shared/repo/job-draft-store";
import { notFound } from "../../../../shared/errors";
import type { SceneDefinition } from "../../../../../../types/render/scene-json";

type ListedSceneAsset = Awaited<ReturnType<typeof listSceneAssets>>[number];
type VoiceProfile = Awaited<ReturnType<typeof getVoiceProfile>>;

const resolveNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const buildSceneAssetMap = (
  sceneAssets: ListedSceneAsset[],
): Map<number, ListedSceneAsset> => {
  return new Map(sceneAssets.map((asset) => [asset.sceneId, asset]));
};

const resolveVoiceProfileId = (input: {
  sceneId: number;
  sceneAssetMap: Map<number, ListedSceneAsset>;
  defaultVoiceProfileId?: string;
}): string | undefined => {
  const sceneProfileId = resolveNonEmptyString(
    input.sceneAssetMap.get(input.sceneId)?.voiceProfileId,
  );
  if (sceneProfileId) {
    return sceneProfileId;
  }
  return resolveNonEmptyString(input.defaultVoiceProfileId);
};

const buildVoiceSettings = (profile: VoiceProfile) => ({
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

const buildVoiceScene = async (input: {
  scene: SceneDefinition;
  sceneAssetMap: Map<number, ListedSceneAsset>;
  defaultVoiceProfileId?: string;
}) => {
  const selectedProfileId = resolveVoiceProfileId({
    sceneId: input.scene.sceneId,
    sceneAssetMap: input.sceneAssetMap,
    defaultVoiceProfileId: input.defaultVoiceProfileId,
  });
  const selectedProfile = selectedProfileId
    ? await getVoiceProfile(selectedProfileId)
    : null;
  if (selectedProfileId && !selectedProfile) {
    throw notFound(`voice profile not found: ${selectedProfileId}`);
  }

  return {
    sceneId: input.scene.sceneId,
    narration: input.scene.narration,
    disableNarration: input.scene.disableNarration,
    durationSec: input.scene.durationSec,
    voiceProfileId: selectedProfile?.profileId,
    voiceId: selectedProfile?.voiceId,
    modelId: selectedProfile?.modelId,
    voiceSettings: buildVoiceSettings(selectedProfile),
  };
};

export const runVoiceModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const job = await getJobOrThrow(jobId);
  const sceneAssetMap = buildSceneAssetMap(await listSceneAssets(jobId));
  const voiceScenes = await Promise.all(
    scenes.map((scene) =>
      buildVoiceScene({
        scene,
        sceneAssetMap,
        defaultVoiceProfileId: job.defaultVoiceProfileId,
      }),
    ),
  );
  const voiceAssets = await generateSceneVoices({
    jobId,
    scenes: voiceScenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId,
    scenes: voiceScenes,
    voiceAssets,
    markStatus: false,
  });
};
