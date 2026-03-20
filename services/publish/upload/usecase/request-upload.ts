import { completeUpload } from "../../upload-worker/usecase/complete-upload";

export const requestUpload = async (
  jobId: string,
): Promise<{ status: string; platform: string; youtubeVideoId?: string }> => {
  const uploaded = await completeUpload(jobId);

  return {
    status: uploaded.status,
    platform: "youtube",
    youtubeVideoId: uploaded.upload.youtubeVideoId,
  };
};
