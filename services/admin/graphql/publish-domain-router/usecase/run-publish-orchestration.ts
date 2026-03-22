import { completeUpload } from "../../../../publish/upload-worker/usecase/complete-upload";
import { buildDefaultPublishTargetsForJob } from "../../../../shared/lib/store/platform-connections";
import {
  listPublishTargetsByJob,
  replacePublishTargetsForJob,
  updatePublishTargetJobItem,
} from "../../../../shared/lib/store/publish-targets-job";
import { getJobMeta } from "../../../../shared/lib/store/video-jobs";
import { badUserInput } from "../../shared/errors";

export const runPublishOrchestrationUsecase = async (input: {
  jobId: string;
}): Promise<{ ok: boolean; jobId: string; message?: string }> => {
  const job = await getJobMeta(input.jobId);
  if (!job) {
    throw badUserInput("job not found");
  }
  const contentId = job.contentId;
  if (!contentId) {
    throw badUserInput("job must have contentId");
  }
  let targets = await listPublishTargetsByJob(input.jobId);
  if (targets.length === 0) {
    const built = await buildDefaultPublishTargetsForJob({
      channelId: contentId,
      jobId: input.jobId,
    });
    await replacePublishTargetsForJob(input.jobId, built);
    targets = built;
  }

  const youtubeQueued = targets.filter(
    (t) => t.platform === "YOUTUBE" && t.status === "QUEUED",
  );
  if (youtubeQueued.length > 0) {
    for (const t of youtubeQueued) {
      await updatePublishTargetJobItem(input.jobId, t.publishTargetId, {
        status: "PUBLISHING",
      });
    }
    try {
      await completeUpload(input.jobId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const t of youtubeQueued) {
        await updatePublishTargetJobItem(input.jobId, t.publishTargetId, {
          status: "FAILED",
          publishError: msg,
        });
      }
      return {
        ok: false,
        jobId: input.jobId,
        message: msg,
      };
    }
    const refreshed = await getJobMeta(input.jobId);
    const vid = refreshed?.uploadVideoId;
    const url = vid ? `https://www.youtube.com/watch?v=${vid}` : undefined;
    for (const t of youtubeQueued) {
      await updatePublishTargetJobItem(input.jobId, t.publishTargetId, {
        status: "PUBLISHED",
        externalPostId: vid,
        externalUrl: url,
      });
    }
  }

  const restQueued = (await listPublishTargetsByJob(input.jobId)).filter(
    (t) => t.status === "QUEUED" && t.platform !== "YOUTUBE",
  );
  for (const t of restQueued) {
    await updatePublishTargetJobItem(input.jobId, t.publishTargetId, {
      status: "SKIPPED",
      publishError: "Platform adapter not implemented for this target",
    });
  }

  return {
    ok: true,
    jobId: input.jobId,
    message: "Orchestration completed",
  };
};
