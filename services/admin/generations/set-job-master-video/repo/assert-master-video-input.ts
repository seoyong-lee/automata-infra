import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime";
import { badUserInput, notFound } from "../../../shared/errors";

const ALLOWED_VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v)$/i;

const validateMasterVideoKey = (jobId: string, s3Key: string): void => {
  const prefix = `assets/${jobId}/master/`;
  if (!s3Key.startsWith(prefix)) {
    throw badUserInput(
      `s3Key must be under ${prefix} (use requestAssetUpload category JOB_MASTER_VIDEO)`,
    );
  }
  if (!ALLOWED_VIDEO_EXTENSION_RE.test(s3Key)) {
    throw badUserInput("s3Key must reference .mp4, .mov, .webm, or .m4v");
  }
};

export const assertMasterVideoInput = async (input: {
  jobId: string;
  s3Key?: string;
}) => {
  if (!input.s3Key) {
    return;
  }
  validateMasterVideoKey(input.jobId, input.s3Key);
  const head = await headObjectFromS3(input.s3Key);
  if (!head.exists) {
    throw notFound("master video file not found");
  }
  if (
    head.contentType &&
    !head.contentType.toLowerCase().startsWith("video/")
  ) {
    throw badUserInput("selected file is not a video asset");
  }
};
