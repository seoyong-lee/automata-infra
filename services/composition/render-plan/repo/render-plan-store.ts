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
import { elevenLabsStoredAlignmentDocumentSchema } from "../../../shared/lib/contracts/elevenlabs-tts-alignment";
import type { ElevenLabsStoredAlignmentDocument } from "../../../shared/lib/contracts/elevenlabs-tts-alignment";
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
  const masterVideoS3Key =
    typeof job.masterVideoS3Key === "string" && job.masterVideoS3Key.trim().length > 0
      ? job.masterVideoS3Key.trim()
      : undefined;
  if (job.jobBriefS3Key) {
    const payload = await getJsonFromS3(job.jobBriefS3Key);
    if (payload) {
      const parsed = parseJobBriefInput(payload);
      return {
        resolvedPolicy: parsed.resolvedPolicy,
        renderSettings: parsed.renderSettings,
        ...(masterVideoS3Key ? { masterVideoS3Key } : {}),
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
          ...(masterVideoS3Key ? { masterVideoS3Key } : {}),
        };
      }
    }
  }
  return masterVideoS3Key ? { masterVideoS3Key } : {};
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

const loadElevenLabsAlignmentDocument = async (
  key: string,
): Promise<ElevenLabsStoredAlignmentDocument | undefined> => {
  const raw = await getJsonFromS3(key);
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const parsed = elevenLabsStoredAlignmentDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
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
  const voiceAlignmentKeyBySceneId = new Map(
    sceneAssets
      .map((scene) => {
        const key =
          typeof scene.voiceAlignmentS3Key === "string"
            ? scene.voiceAlignmentS3Key.trim()
            : "";
        return key ? ([scene.sceneId, key] as const) : null;
      })
      .filter((entry): entry is readonly [number, string] => entry !== null),
  );

  const resolveVoiceAlignmentKey = (
    sceneId: number,
    explicit?: string,
  ): string | undefined => {
    const trimmed = explicit?.trim();
    if (trimmed) {
      return trimmed;
    }
    return voiceAlignmentKeyBySceneId.get(sceneId);
  };

  const enrichVoiceAsset = async (row: {
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
    voiceAlignmentS3Key?: string;
  }) => {
    const voiceDurationSec =
      (await resolveStoredVoiceDurationSec(row.voiceS3Key)) ??
      row.voiceDurationSec;
    const alignmentKey = resolveVoiceAlignmentKey(
      row.sceneId,
      row.voiceAlignmentS3Key,
    );
    const elevenLabsAlignment = alignmentKey
      ? await loadElevenLabsAlignmentDocument(alignmentKey)
      : undefined;
    return {
      sceneId: row.sceneId,
      voiceS3Key: row.voiceS3Key,
      voiceDurationSec,
      ...(alignmentKey ? { voiceAlignmentS3Key: alignmentKey } : {}),
      ...(elevenLabsAlignment ? { elevenLabsAlignment } : {}),
    };
  };

  const imageAssets =
    event.imageAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key:
        typeof scene.imageS3Key === "string" ? scene.imageS3Key : undefined,
    }));
  const voiceAssets = event.voiceAssets
    ? await Promise.all(
        event.voiceAssets.map((scene) =>
          enrichVoiceAsset({
            sceneId: scene.sceneId,
            voiceS3Key: scene.voiceS3Key,
            voiceDurationSec: scene.voiceDurationSec,
            voiceAlignmentS3Key: scene.voiceAlignmentS3Key,
          }),
        ),
      )
    : await Promise.all(
        sceneAssets.map((scene) => {
          const voiceS3Key =
            typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : undefined;
          return enrichVoiceAsset({
            sceneId: scene.sceneId,
            voiceS3Key,
            voiceDurationSec:
              typeof scene.voiceDurationSec === "number"
                ? scene.voiceDurationSec
                : undefined,
            voiceAlignmentS3Key:
              typeof scene.voiceAlignmentS3Key === "string"
                ? scene.voiceAlignmentS3Key
                : undefined,
          });
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
