import { Handler } from "aws-lambda";
import {
  resolveRenderPolicyConfig,
  buildRenderPlan,
} from "./usecase/build-render-plan";
import { buildRenderPlanScenes } from "./usecase/build-render-plan-scenes";
import {
  persistRenderPlan,
  persistRenderPlanGapDiagnostics,
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
  const mergedEvent: RenderPlanEvent = {
    ...event,
    ...(storedInputs.masterVideoS3Key && !event.masterVideoS3Key
      ? { masterVideoS3Key: storedInputs.masterVideoS3Key }
      : {}),
  };
  const { imageAssets, voiceAssets, videoAssets } =
    await resolveRenderPlanAssets(mergedEvent);
  const builtScenes = buildRenderPlanScenes(
    {
      ...mergedEvent,
      imageAssets,
      videoAssets,
      voiceAssets,
    },
    config.sceneGapSec,
    config.output.fps,
  );
  const renderPlan = buildRenderPlan(mergedEvent, builtScenes, config);

  await persistRenderPlan(event.jobId, renderPlan);
  try {
    await persistRenderPlanGapDiagnostics(event.jobId, {
      sceneGapSec: config.sceneGapSec,
      renderPlanS3Key: renderPlan.outputKey,
      totalDurationSec: builtScenes.totalDurationSec,
      scenes: builtScenes.scenes,
    });
  } catch {
    // best-effort; render plan is already persisted
  }

  return {
    ...mergedEvent,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
