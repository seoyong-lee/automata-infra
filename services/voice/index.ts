import { Handler } from "aws-lambda";
import { saveVoiceAssets } from "./repo/save-voice-assets";
import { generateSceneVoices } from "./usecase/generate-scene-voices";

type SceneJsonEvent = {
  jobId: string;
  sceneId?: number;
  narration?: string;
  durationSec?: number;
  scene?: {
    sceneId: number;
    narration: string;
    durationSec: number;
  };
  sceneJson?: {
    scenes: Array<{
      sceneId: number;
      narration: string;
      durationSec: number;
    }>;
  };
};

const getScenes = (event: SceneJsonEvent) => {
  if (event.scene) {
    return [event.scene];
  }

  if (
    typeof event.sceneId === "number" &&
    event.narration &&
    typeof event.durationSec === "number"
  ) {
    return [
      {
        sceneId: event.sceneId,
        narration: event.narration,
        durationSec: event.durationSec,
      },
    ];
  }

  return event.sceneJson?.scenes ?? [];
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { voiceAssets: unknown[]; status: string }
> = async (event) => {
  const scenes = getScenes(event);
  const voiceAssets = await generateSceneVoices({
    jobId: event.jobId,
    scenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId: event.jobId,
    scenes,
    voiceAssets,
    markStatus: !event.scene,
  });

  return {
    ...event,
    voiceAssets,
    status: "ASSETS_READY",
  };
};
