import {
  deleteContentMeta,
  getContentMeta,
  listJobMetasByContentId,
} from "../../../../shared/lib/store/video-jobs";
import { deleteAdminJobRecord } from "../../../jobs/delete-job/repo/delete-job";
import { notFound } from "../../../shared/errors";

export const deleteContentCascade = async (
  contentId: string,
): Promise<{ ok: true; contentId: string }> => {
  const content = await getContentMeta(contentId);
  if (!content) {
    throw notFound("content not found");
  }

  let nextToken: string | null | undefined = undefined;
  do {
    const page = await listJobMetasByContentId({
      contentId,
      limit: 50,
      nextToken: nextToken ?? undefined,
    });
    for (const job of page.items) {
      await deleteAdminJobRecord(job.jobId, { skipStatusCheck: true });
    }
    nextToken = page.nextToken;
  } while (nextToken);

  await deleteContentMeta(contentId);
  return { ok: true, contentId };
};
