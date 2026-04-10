import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime";
import { badUserInput, notFound } from "../../../shared/errors";

const ALLOWED_AUDIO_EXTENSION_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;
const LIBRARY_BGM_PREFIX = "library/bgm/";

const validateBackgroundMusicKey = (jobId: string, s3Key: string): void => {
  const jobBgm = s3Key.startsWith(`assets/${jobId}/bgm/`);
  const libraryBgm = s3Key.startsWith(LIBRARY_BGM_PREFIX);
  if (!jobBgm && !libraryBgm) {
    throw badUserInput(
      "s3Key must be this job's assets/{jobId}/bgm/… path or a shared library/bgm/… key",
    );
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
