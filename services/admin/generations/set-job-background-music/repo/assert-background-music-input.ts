import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime";
import { badUserInput, notFound } from "../../../shared/errors";

const ALLOWED_AUDIO_EXTENSION_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;

const validateBackgroundMusicKey = (jobId: string, s3Key: string): void => {
  if (!s3Key.startsWith(`assets/${jobId}/bgm/`)) {
    throw badUserInput("s3Key must point to this job's bgm upload path");
  }
  if (!ALLOWED_AUDIO_EXTENSION_RE.test(s3Key)) {
    throw badUserInput("s3Key must reference a supported audio file");
  }
};

export const assertBackgroundMusicInput = async (input: {
  jobId: string;
  s3Key?: string;
}) => {
  if (!input.s3Key) {
    return;
  }
  validateBackgroundMusicKey(input.jobId, input.s3Key);
  const head = await headObjectFromS3(input.s3Key);
  if (!head.exists) {
    throw notFound("background music file not found");
  }
  if (
    head.contentType &&
    !head.contentType.toLowerCase().startsWith("audio/")
  ) {
    throw badUserInput("selected file is not an audio asset");
  }
};
