import { Handler } from "aws-lambda";
import { getJobMeta, updateJobMeta } from "../../shared/lib/store/video-jobs";
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
  const validation = await validateGeneratedAssets({
    sceneJson: event.sceneJson,
    imageAssets: event.imageAssets,
    videoAssets: event.videoAssets,
    voiceAssets: event.voiceAssets,
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
