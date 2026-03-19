import { Handler } from "aws-lambda";
import {
  putUploadRecord,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

type UploadWorkerEvent = {
  jobId: string;
};

export const handler: Handler<
  UploadWorkerEvent,
  UploadWorkerEvent & { upload: unknown; status: string }
> = async (event) => {
  const uploadedAt = new Date().toISOString();
  const youtubeVideoId = `yt_${event.jobId}`;

  await putUploadRecord(event.jobId, {
    platform: "youtube",
    uploadStatus: "UPLOADED",
    youtubeVideoId,
    visibility: "private",
    publishedAt: uploadedAt,
  });

  await updateJobMeta(
    event.jobId,
    {
      uploadStatus: "UPLOADED",
      uploadVideoId: youtubeVideoId,
    },
    "UPLOADED",
  );

  return {
    ...event,
    status: "UPLOADED",
    upload: {
      platform: "youtube",
      youtubeVideoId,
      visibility: "private",
      uploadedAt,
    },
  };
};
