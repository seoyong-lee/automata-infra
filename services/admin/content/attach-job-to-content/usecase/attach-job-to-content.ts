import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { AttachJobToContentInputDto } from "../../../shared/types";
import {
  assertAttachableContentId,
  assertJobCanAttachToContent,
} from "../normalize/assert-attach-job-to-content";
import { loadAttachJobContext } from "../repo/load-attach-job-context";
import { syncJobContentLinkArtifacts } from "../repo/sync-job-content-link-artifacts";

export const attachAdminJobToContent = async (
  input: AttachJobToContentInputDto,
) => {
  assertAttachableContentId(input.contentId);

  const context = await loadAttachJobContext(input);
  assertJobCanAttachToContent(context.job.contentId);
  await syncJobContentLinkArtifacts(context);
  await updateJobMeta(context.job.jobId, {
    contentId: context.parent.contentId,
  });

  const updated = await getJobOrThrow(context.job.jobId);
  return mapJobMetaToAdminJob(updated);
};
