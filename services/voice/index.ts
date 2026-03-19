import { Handler } from "aws-lambda";
import { saveVoiceAssets } from "./repo/save-voice-assets";
import { generateSceneVoices } from "./usecase/generate-scene-voices";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      narration: string;
      durationSec: number;
    }>;
  };
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { voiceAssets: unknown[]; status: string }
> = async (event) => {
  const voiceAssets = await generateSceneVoices({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    voiceAssets,
  });

  return {
    ...event,
    voiceAssets,
    status: "ASSETS_READY",
  };
};
