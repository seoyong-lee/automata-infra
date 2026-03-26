import { requestUpload } from "../../../upload/usecase/request-upload";

export const requestUploadMutation = async (jobId: string) => {
  const result = await requestUpload(jobId);
  return {
    ok: true,
    jobId,
    status: result.status,
    platform: result.platform.toUpperCase(),
  };
};
