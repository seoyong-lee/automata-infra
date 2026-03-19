import { Handler } from "aws-lambda";
import { generateSceneVoice } from "../shared/lib/providers/media";
import { putSceneAsset, updateJobMeta } from "../shared/lib/store/video-jobs";

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

export const handler: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { voiceAssets: unknown[]; status: string }
> = async (event) => {
  const voiceAssets = [];

  for (const scene of event.sceneJson.scenes) {
    const asset = await generateSceneVoice({
      jobId: event.jobId,
      sceneId: scene.sceneId,
      text: scene.narration,
      secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
    });

    voiceAssets.push({
      ...asset,
      durationSec: scene.durationSec,
    });
    await putSceneAsset(event.jobId, scene.sceneId, {
      ...asset,
      durationSec: scene.durationSec,
    });
  }

  await updateJobMeta(event.jobId, {}, "ASSETS_READY");

  return {
    ...event,
    voiceAssets,
    status: "ASSETS_READY",
  };
};
