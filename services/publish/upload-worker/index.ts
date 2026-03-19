import { Handler } from "aws-lambda";
import { completeUpload } from "./usecase/complete-upload";

type UploadWorkerEvent = {
  jobId: string;
};

export const run: Handler<
  UploadWorkerEvent,
  UploadWorkerEvent & { upload: unknown; status: string }
> = async (event) => {
  const result = await completeUpload(event.jobId);

  return {
    ...result,
  };
};
