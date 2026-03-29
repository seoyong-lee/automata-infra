import { getContentMeta, getJobMeta } from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";

export type AttachJobToContentContext = {
  parent: NonNullable<Awaited<ReturnType<typeof getContentMeta>>>;
  job: NonNullable<Awaited<ReturnType<typeof getJobMeta>>>;
};

export const loadAttachJobContext = async (input: {
  contentId: string;
  jobId: string;
}): Promise<AttachJobToContentContext> => {
  const [parent, job] = await Promise.all([
    getContentMeta(input.contentId),
    getJobMeta(input.jobId),
  ]);

  if (!parent) {
    throw notFound("content not found");
  }
  if (!job) {
    throw notFound("job not found");
  }

  return {
    parent,
    job,
  };
};
