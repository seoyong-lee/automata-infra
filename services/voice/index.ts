import { Handler } from "aws-lambda";
import type { SceneJson } from "../../types/render/scene-json";
import { pickSceneByReviewTarget } from "../shared/lib/workflow/pick-scene-for-review-regeneration";
import { getJobMeta } from "../shared/lib/store/video-jobs";
import { saveVoiceAssets } from "./repo/save-voice-assets";
import { buildVoiceScenesForJob } from "./usecase/build-voice-scenes-for-job";
import { generateSceneVoices } from "./usecase/generate-scene-voices";

type SceneJsonEvent = {
  jobId: string;
  sceneId?: number;
  narration?: string;
  durationSec?: number;
  scene?: {
    sceneId: number;
    narration: string;
    disableNarration?: boolean;
    durationSec: number;
  };
  sceneJson?: SceneJson;
  reviewDecision?: {
    action?: string;
    regenerationScope?: string;
    targetSceneId?: number;
  };
};

const getScenes = (event: SceneJsonEvent) => {
  if (event.scene) {
    return [event.scene];
  }

  if (
    typeof event.sceneId === "number" &&
    typeof event.narration === "string" &&
    typeof event.durationSec === "number"
  ) {
    return [
      {
        sceneId: event.sceneId,
        narration: event.narration,
        durationSec: event.durationSec,
        disableNarration: false,
      },
    ];
  }

  if (typeof event.reviewDecision?.targetSceneId === "number") {
    const picked = pickSceneByReviewTarget(event);
    if (!picked) {
      throw new Error(
        `targetSceneId ${event.reviewDecision.targetSceneId} not found in sceneJson`,
      );
    }
    return [
      {
        sceneId: picked.sceneId,
        narration: picked.narration,
        durationSec: picked.durationSec,
        disableNarration: picked.disableNarration,
      },
    ];
  }

  return event.sceneJson?.scenes ?? [];
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { voiceAssets: unknown[]; status: string }
> = async (event) => {
  const rawScenes = getScenes(event);
  const job =
    typeof event.jobId === "string" && event.jobId.trim().length > 0
      ? await getJobMeta(event.jobId)
      : null;
  const scenes =
    job && rawScenes.length > 0
      ? await buildVoiceScenesForJob({
          jobId: event.jobId,
          job,
          scenes: rawScenes,
        })
      : rawScenes;
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
