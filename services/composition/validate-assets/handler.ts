import { Handler } from "aws-lambda";

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
  AssetEvent & { validation: unknown }
> = async (event) => {
  const sceneCount = event.sceneJson.scenes.length;

  return {
    ...event,
    validation: {
      valid: sceneCount > 0,
      sceneCount,
      checkedAt: new Date().toISOString(),
    },
  };
};
