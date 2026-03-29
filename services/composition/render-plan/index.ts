import { Handler } from "aws-lambda";
import {
  resolveRenderPolicyConfig,
  buildRenderPlan,
} from "./usecase/build-render-plan";
import { buildRenderPlanScenes } from "./usecase/build-render-plan-scenes";
import {
  persistRenderPlan,
  resolveRenderPlanAssets,
  resolveStoredRenderInputs,
} from "./repo/render-plan-store";
import type { RenderPlanEvent } from "./types";

export {
  buildRenderPlan,
  resolveRenderPolicyConfig,
} from "./usecase/build-render-plan";
export { buildRenderPlanScenes } from "./usecase/build-render-plan-scenes";

export const run: Handler<
  RenderPlanEvent,
  RenderPlanEvent & { renderPlan: unknown; status: string }
> = async (event) => {
  const storedInputs = await resolveStoredRenderInputs(event.jobId);
  const config = resolveRenderPolicyConfig(event, storedInputs);
  const { imageAssets, voiceAssets, videoAssets } =
    await resolveRenderPlanAssets(event);
  const builtScenes = buildRenderPlanScenes(
    {
      ...event,
      imageAssets,
      videoAssets,
      voiceAssets,
    },
    config.sceneGapSec,
  );
  const renderPlan = buildRenderPlan(event, builtScenes, config);

  await persistRenderPlan(event.jobId, renderPlan);

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
