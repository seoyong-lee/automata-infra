import { Handler } from "aws-lambda";
import { getJobMeta, updateJobMeta } from "../../shared/lib/store/video-jobs";

type AssetEvent = {
  sceneJson: {
    scenes: Array<{
      sceneId: number;
    }>;
  };
  imageAssets?: unknown[];
  videoAssets?: unknown[];
  voiceAssets?: unknown[];
};

export const handler: Handler<
  AssetEvent,
  AssetEvent & { validation: unknown; status: string }
> = async (event) => {
  const sceneCount = event.sceneJson.scenes.length;
  const job = await getJobMeta((event as AssetEvent & { jobId: string }).jobId);
  const valid = sceneCount > 0 && Boolean(job);

  if ((event as AssetEvent & { jobId: string }).jobId) {
    await updateJobMeta(
      (event as AssetEvent & { jobId: string }).jobId,
      {},
      valid ? "VALIDATING" : "FAILED",
    );
  }

  return {
    ...event,
    validation: {
      valid,
      sceneCount,
      checkedAt: new Date().toISOString(),
      topicReady: Boolean(job),
    },
    status: valid ? "VALIDATING" : "FAILED",
  };
};
