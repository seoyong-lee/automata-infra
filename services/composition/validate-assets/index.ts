import { Handler } from "aws-lambda";
import {
  getJobMeta,
  listSceneAssets,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { validateGeneratedAssets } from "./usecase/validate-generated-assets";

type AssetEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      durationSec?: number;
      subtitle?: string;
    }>;
  };
  imageAssets?: unknown[];
  videoAssets?: unknown[];
  voiceAssets?: unknown[];
};

export const run: Handler<
  AssetEvent,
  AssetEvent & { validation: unknown; status: string }
> = async (event) => {
  const job = await getJobMeta(event.jobId);
  const sceneAssets = await listSceneAssets(event.jobId);
  const imageAssets =
    event.imageAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key: scene.imageS3Key,
    }));
  const videoAssets =
    event.videoAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      videoClipS3Key: scene.videoClipS3Key,
    }));
  const voiceAssets =
    event.voiceAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      voiceS3Key: scene.voiceS3Key,
    }));
  const validation = await validateGeneratedAssets({
    sceneJson: event.sceneJson,
    imageAssets,
    videoAssets,
    voiceAssets,
    job,
  });

  await updateJobMeta(
    event.jobId,
    {},
    validation.valid ? "VALIDATING" : "FAILED",
  );

  if (!validation.valid) {
    throw new Error(`Asset validation failed: ${validation.errors.join("; ")}`);
  }

  return {
    ...event,
    validation,
    status: "VALIDATING",
  };
};
