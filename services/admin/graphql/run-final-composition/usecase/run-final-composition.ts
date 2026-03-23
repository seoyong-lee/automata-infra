import {
  getJsonFromS3,
  putBufferToS3,
} from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { listSceneAssets } from "../../../../shared/lib/store/video-jobs";
import { run as runFinalCompositionStage } from "../../../../composition/final-composition";
import { run as runRenderPlanStage } from "../../../../composition/render-plan";
import { run as runValidateAssetsStage } from "../../../../composition/validate-assets";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";

import type { SceneJson } from "../../../../../types/render/scene-json";
import type {
  RenderPlan,
  RenderPlanOutput,
  RenderPlanSubtitleStyle,
} from "../../../../../types/render/render-plan";

type RenderPipelineContext = {
  jobId: string;
  sceneJson: SceneJson;
  imageAssets: Array<{ sceneId: number; imageS3Key?: string }>;
  videoAssets: Array<{ sceneId: number; videoClipS3Key?: string }>;
  voiceAssets: Array<{
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
  }>;
  backgroundMusicS3Key?: string;
};

export type FinalCompositionScope = {
  burnInSubtitles?: boolean;
};

type RenderPlanResult = {
  renderPlan?: RenderPlan;
};

const noopCallback = (() => undefined) as never;
const noopContext = {} as never;
const SUBTITLE_ASS_CONTENT_TYPE = "text/x-ass";
const DEFAULT_RENDER_OUTPUT: RenderPlanOutput = {
  format: "mp4",
  size: {
    width: 1080,
    height: 1920,
  },
  fps: 30,
};
const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

const formatAssTimestamp = (seconds: number): string => {
  const safeCs = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(safeCs / 360_000);
  const minutes = Math.floor((safeCs % 360_000) / 6_000);
  const secs = Math.floor((safeCs % 6_000) / 100);
  const centis = safeCs % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const stripHashPrefix = (value: string): string => {
  return value.startsWith("#") ? value.slice(1) : value;
};

const toAssColor = (value: string, opacity = 1): string => {
  const normalized = stripHashPrefix(value).padStart(6, "0").slice(0, 6);
  const red = normalized.slice(0, 2);
  const green = normalized.slice(2, 4);
  const blue = normalized.slice(4, 6);
  const alpha = Math.round((1 - clamp(opacity, 0, 1)) * 255);
  return `&H${alpha.toString(16).toUpperCase().padStart(2, "0")}${blue}${green}${red}&`;
};

const escapeAssText = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\N")
    .replace(/[{}]/g, "")
    .trim();
};

const resolveSubtitleAlignment = (
  position: RenderPlanSubtitleStyle["position"],
): number => {
  if (position === "top") {
    return 8;
  }
  if (position === "center") {
    return 5;
  }
  return 2;
};

const resolveSubtitleBasePosition = (
  style: RenderPlanSubtitleStyle,
  output: RenderPlanOutput,
) => {
  const baseYRatio =
    style.position === "top" ? 0.14 : style.position === "center" ? 0.5 : 0.86;
  const x = Math.round(output.size.width * (0.5 + style.offset.x));
  const y = Math.round(output.size.height * (baseYRatio + style.offset.y));
  return {
    x: clamp(x, 0, output.size.width),
    y: clamp(y, 0, output.size.height),
    alignment: resolveSubtitleAlignment(style.position),
  };
};

const buildAssStyleLine = (
  style: RenderPlanSubtitleStyle,
  output: RenderPlanOutput,
): string => {
  return [
    "Style: Default",
    style.fontFamily.replace(/,/g, " "),
    Math.round(style.fontSize),
    toAssColor(style.color, style.opacity),
    toAssColor(style.color, style.opacity),
    toAssColor(style.strokeColor, 1),
    "&H00000000&",
    0,
    0,
    0,
    0,
    100,
    100,
    0,
    0,
    1,
    Math.max(0, style.strokeWidth),
    0,
    resolveSubtitleAlignment(style.position),
    Math.round(output.size.width * 0.06),
    Math.round(output.size.width * 0.06),
    Math.round(output.size.height * 0.06),
    1,
  ].join(",");
};

const buildSubtitleAss = (
  renderPlan: Pick<RenderPlan, "output" | "scenes" | "subtitles">,
): string => {
  const output = renderPlan.output ?? DEFAULT_RENDER_OUTPUT;
  const style = renderPlan.subtitles.style;
  const basePosition = resolveSubtitleBasePosition(style, output);
  const events = renderPlan.scenes
    .map((scene) => ({
      startSec: scene.startSec,
      endSec: scene.endSec,
      subtitle: typeof scene.subtitle === "string" ? scene.subtitle.trim() : "",
    }))
    .filter(
      (scene) =>
        scene.subtitle.length > 0 &&
        typeof scene.startSec === "number" &&
        typeof scene.endSec === "number" &&
        scene.endSec > scene.startSec,
    )
    .map(
      (scene) =>
        `Dialogue: 0,${formatAssTimestamp(scene.startSec)},${formatAssTimestamp(scene.endSec)},Default,,0,0,0,,{\\an${basePosition.alignment}\\pos(${basePosition.x},${basePosition.y})}${escapeAssText(scene.subtitle)}`,
    );

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${output.size.width}`,
    `PlayResY: ${output.size.height}`,
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    buildAssStyleLine(style, output),
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    ...events,
    "",
  ].join("\n");
};

const maybePersistSubtitleAss = async (
  jobId: string,
  renderPlan: RenderPlan,
  burnInSubtitles: boolean | undefined,
): Promise<string | undefined> => {
  if (!burnInSubtitles) {
    return undefined;
  }
  const hasSubtitleEntries = renderPlan.scenes.some(
    (scene) => typeof scene.subtitle === "string" && scene.subtitle.trim().length > 0,
  );
  if (!hasSubtitleEntries) {
    return undefined;
  }
  const ass = buildSubtitleAss(renderPlan);
  if (!ass.trim()) {
    return undefined;
  }
  const key = `rendered/${jobId}/subtitles/latest.ass`;
  await putBufferToS3(key, ass, SUBTITLE_ASS_CONTENT_TYPE);
  return key;
};

const loadRenderPipelineContext = async (
  jobId: string,
): Promise<RenderPipelineContext> => {
  const job = await getJobOrThrow(jobId);
  const sceneJsonS3Key = job.sceneJsonS3Key?.trim();
  if (!sceneJsonS3Key) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  const sceneAssets = await listSceneAssets(jobId);

  return {
    jobId,
    sceneJson,
    imageAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      imageS3Key:
        typeof asset.imageS3Key === "string" ? asset.imageS3Key : undefined,
    })),
    videoAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      videoClipS3Key:
        typeof asset.videoClipS3Key === "string"
          ? asset.videoClipS3Key
          : undefined,
    })),
    voiceAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      voiceS3Key:
        typeof asset.voiceS3Key === "string" ? asset.voiceS3Key : undefined,
      voiceDurationSec:
        typeof asset.voiceDurationSec === "number"
          ? asset.voiceDurationSec
          : undefined,
    })),
    backgroundMusicS3Key:
      typeof job.backgroundMusicS3Key === "string"
        ? job.backgroundMusicS3Key
        : undefined,
  };
};

export const runFinalCompositionCore = async (
  jobId: string,
  scope?: FinalCompositionScope,
): Promise<ReturnType<typeof mapJobMetaToAdminJob>> => {
  const context = await loadRenderPipelineContext(jobId);

  await runValidateAssetsStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  );

  const renderPlanResult = (await runRenderPlanStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  )) as RenderPlanResult;

  const renderPlan = renderPlanResult.renderPlan;
  if (!renderPlan || typeof renderPlan !== "object") {
    throw new Error("render plan not created");
  }
  const subtitleAssS3Key = await maybePersistSubtitleAss(
    jobId,
    renderPlan,
    scope?.burnInSubtitles,
  );

  await runFinalCompositionStage(
    {
      jobId,
      renderPlan: {
        ...renderPlan,
        ...(scope?.burnInSubtitles !== undefined
          ? { burnInSubtitles: scope.burnInSubtitles }
          : {}),
        ...(scope?.burnInSubtitles !== undefined
          ? {
              subtitles: {
                ...renderPlan.subtitles,
                burnIn: scope.burnInSubtitles,
                ...(subtitleAssS3Key ? { assS3Key: subtitleAssS3Key } : {}),
              },
            }
          : {}),
        ...(subtitleAssS3Key ? { subtitleAssS3Key } : {}),
        ...(context.backgroundMusicS3Key
          ? { soundtrackSrc: context.backgroundMusicS3Key }
          : {}),
      },
    },
    noopContext,
    noopCallback,
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminFinalComposition = async (
  jobId: string,
  triggeredBy?: string,
  scope?: FinalCompositionScope,
): Promise<ReturnType<typeof mapJobMetaToAdminJob>> => {
  const job = await getJobOrThrow(jobId);
  const inputSnapshotId =
    job.assetManifestS3Key ?? job.sceneJsonS3Key ?? undefined;

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "FINAL_COMPOSITION",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "FINAL_COMPOSITION",
        ...(scope ? { finalCompositionScope: scope } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const refreshed = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(refreshed);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "FINAL_COMPOSITION",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runFinalCompositionCore(jobId, scope);
    await finish(
      "SUCCEEDED",
      undefined,
      result.finalVideoS3Key ?? result.previewS3Key,
    );
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
