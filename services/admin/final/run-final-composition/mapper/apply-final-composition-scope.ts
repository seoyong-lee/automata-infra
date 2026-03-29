import type { RenderPlan } from "../../../../../types/render/render-plan";
import type { RenderPipelineContext } from "../repo/load-render-pipeline-context";
import type { FinalCompositionScope } from "../usecase/run-final-composition";

export const resolveBurnInSubtitles = (
  renderPlan: RenderPlan,
  scope?: FinalCompositionScope,
) => {
  return scope?.burnInSubtitles ?? renderPlan.subtitles?.burnIn ?? false;
};

export const applyFinalCompositionScope = (input: {
  renderPlan: RenderPlan;
  scope?: FinalCompositionScope;
  subtitleAssS3Key?: string;
  context: Pick<RenderPipelineContext, "backgroundMusicS3Key">;
}) => {
  const effectiveBurnInSubtitles = resolveBurnInSubtitles(
    input.renderPlan,
    input.scope,
  );

  return {
    renderPlan: {
      ...input.renderPlan,
      burnInSubtitles: effectiveBurnInSubtitles,
      subtitles: {
        ...input.renderPlan.subtitles,
        burnIn: effectiveBurnInSubtitles,
        ...(input.subtitleAssS3Key ? { assS3Key: input.subtitleAssS3Key } : {}),
      },
      ...(input.subtitleAssS3Key
        ? { subtitleAssS3Key: input.subtitleAssS3Key }
        : {}),
      ...(input.context.backgroundMusicS3Key
        ? { soundtrackSrc: input.context.backgroundMusicS3Key }
        : {}),
    },
    effectiveBurnInSubtitles,
  };
};
