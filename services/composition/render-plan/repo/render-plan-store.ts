import { parseBuffer } from "music-metadata";
import {
  getBufferFromS3,
  getJsonFromS3,
  putJsonToS3,
} from "../../../shared/lib/aws/runtime";
import {
  parseContentBrief,
  parseJobBriefInput,
} from "../../../shared/lib/contracts/canonical-io-schemas";
import {
  getJobMeta,
  listSceneAssets,
  putRenderArtifact,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";
import type { RenderPlanScene } from "../../../../types/render/render-plan";
import type {
  ResolvedRenderPlanAssets,
  RenderPlanEvent,
  StoredRenderInputs,
} from "../types";

export const resolveStoredRenderInputs = async (
  jobId: string,
): Promise<StoredRenderInputs> => {
  const job = await getJobMeta(jobId);
  if (!job) {
    return {};
  }
  if (job.jobBriefS3Key) {
    const payload = await getJsonFromS3(job.jobBriefS3Key);
    if (payload) {
      const parsed = parseJobBriefInput(payload);
      return {
        resolvedPolicy: parsed.resolvedPolicy,
        renderSettings: parsed.renderSettings,
      };
    }
  }
  if (job.contentBriefS3Key) {
    const payload = await getJsonFromS3(job.contentBriefS3Key);
    if (payload) {
      const parsed = parseContentBrief(payload);
      if (parsed.resolvedPolicy) {
        return {
          resolvedPolicy: parsed.resolvedPolicy,
        };
      }
    }
  }
  return {};
};

export const persistRenderPlan = async (
  jobId: string,
  renderPlan: { outputKey: string },
): Promise<void> => {
  await putJsonToS3(renderPlan.outputKey, renderPlan);
  await putRenderArtifact(jobId, {
    renderPlanS3Key: renderPlan.outputKey,
    createdAt: new Date().toISOString(),
  });
  await updateJobMeta(
    jobId,
    {
      renderPlanS3Key: renderPlan.outputKey,
    },
    "RENDER_PLAN_READY",
  );
};

/** `sceneGapSec` passed into `buildRenderPlanScenes` and per-scene gaps (S3 triage). */
export const persistRenderPlanGapDiagnostics = async (
  jobId: string,
  input: {
    sceneGapSec: number;
    renderPlanS3Key: string;
    totalDurationSec: number;
    scenes: RenderPlanScene[];
  },
): Promise<void> => {
  await putJsonToS3(`logs/${jobId}/composition/render-plan-gap-diagnostics.json`, {
    at: new Date().toISOString(),
    sceneGapSec: input.sceneGapSec,
    renderPlanS3Key: input.renderPlanS3Key,
    totalDurationSec: input.totalDurationSec,
    scenes: input.scenes.map((s) => ({
      sceneId: s.sceneId,
      startSec: s.startSec,
      endSec: s.endSec,
      durationSec: s.durationSec,
      gapAfterSec: s.gapAfterSec,
    })),
  });
};

const resolveStoredVoiceDurationSec = async (
  voiceS3Key?: string,
): Promise<number | undefined> => {
  if (!voiceS3Key) {
    return undefined;
  }
  const object = await getBufferFromS3(voiceS3Key);
  if (!object) {
    return undefined;
  }
  try {
    const metadata = await parseBuffer(object.buffer, {
      mimeType: object.contentType ?? "audio/mpeg",
    });
    const durationSec = metadata.format.duration;
    return typeof durationSec === "number" && Number.isFinite(durationSec)
      ? durationSec
      : undefined;
  } catch {
    return undefined;
  }
};

export const resolveRenderPlanAssets = async (
  event: RenderPlanEvent,
): Promise<ResolvedRenderPlanAssets> => {
  const sceneAssets = await listSceneAssets(event.jobId);
  const imageAssets =
    event.imageAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key:
        typeof scene.imageS3Key === "string" ? scene.imageS3Key : undefined,
    }));
  const voiceAssets = event.voiceAssets
    ? await Promise.all(
        event.voiceAssets.map(async (scene) => ({
          ...scene,
          voiceDurationSec:
            (await resolveStoredVoiceDurationSec(scene.voiceS3Key)) ??
            scene.voiceDurationSec,
        })),
      )
    : await Promise.all(
        sceneAssets.map(async (scene) => {
          const voiceS3Key =
            typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : undefined;
          return {
            sceneId: scene.sceneId,
            voiceS3Key,
            voiceDurationSec:
              (await resolveStoredVoiceDurationSec(voiceS3Key)) ??
              (typeof scene.voiceDurationSec === "number"
                ? scene.voiceDurationSec
                : undefined),
          };
        }),
      );
  const videoAssets =
    event.videoAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      videoClipS3Key:
        typeof scene.videoClipS3Key === "string"
          ? scene.videoClipS3Key
          : undefined,
    }));
  return { imageAssets, voiceAssets, videoAssets };
};
