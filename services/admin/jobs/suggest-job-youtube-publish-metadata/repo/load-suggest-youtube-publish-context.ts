import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { getContentMeta } from "../../../../shared/lib/store/video-jobs";
import type {
  ContentItem,
  JobMetaItem,
} from "../../../../shared/lib/store/video-jobs-shared";
import type { JobBriefDto } from "../../../shared/types";
import type { SceneJson } from "../../../../../types/render/scene-json";
import {
  getJobOrThrow,
  getStoredJobBrief,
  getStoredSceneJsonRaw,
} from "../../../shared/repo/job-draft-store";
import { badUserInput, notFound } from "../../../shared/errors";

export type SuggestYoutubePublishContext = {
  jobId: string;
  job: JobMetaItem;
  jobBrief: JobBriefDto;
  sceneJson: SceneJson;
  channel: ContentItem;
  outputLocaleHint?: string;
};

export const loadSuggestYoutubePublishContext = async (input: {
  jobId: string;
  outputLocaleHint?: string;
}): Promise<SuggestYoutubePublishContext> => {
  const job = await getJobOrThrow(input.jobId);
  const contentId = job.contentId?.trim();

  if (
    !contentId ||
    contentId.length === 0 ||
    contentId === ADMIN_UNASSIGNED_CONTENT_ID
  ) {
    throw badUserInput(
      "Job must be attached to a content (channel) to suggest YouTube metadata",
    );
  }

  const [jobBrief, sceneJson, channel] = await Promise.all([
    getStoredJobBrief(job),
    getStoredSceneJsonRaw(job),
    getContentMeta(contentId),
  ]);

  if (!jobBrief) {
    throw badUserInput("Job brief not found; save the job brief first");
  }

  if (!sceneJson) {
    throw badUserInput(
      "Scene JSON not found; run scene generation before suggesting upload metadata",
    );
  }

  if (!channel) {
    throw notFound("Content (channel) not found for this job");
  }

  return {
    jobId: input.jobId,
    job,
    jobBrief,
    sceneJson,
    channel,
    outputLocaleHint: input.outputLocaleHint?.trim(),
  };
};
