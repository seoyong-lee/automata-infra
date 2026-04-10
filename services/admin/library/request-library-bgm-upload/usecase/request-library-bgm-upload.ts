import { createSignedUploadUrlForS3 } from "../../../../shared/lib/aws/runtime";
import { badUserInput } from "../../../shared/errors";
import type { RequestLibraryBgmUploadInput } from "../normalize/parse-request-library-bgm-upload-args";

const INVALID_FILE_CHARS_RE = /[^A-Za-z0-9._-]+/g;
const AUDIO_EXTENSION_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;

const sanitizeFileName = (fileName: string, fallback: string): string => {
  const base = fileName.split("/").pop() ?? fileName;
  const normalized = base
    .replace(INVALID_FILE_CHARS_RE, "-")
    .replace(/-+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || fallback;
};

export const requestLibraryBgmUpload = async (
  input: RequestLibraryBgmUploadInput,
): Promise<{
  uploadUrl: string;
  s3Key: string;
  fileName: string;
  contentType: string;
}> => {
  if (!input.contentType.toLowerCase().startsWith("audio/")) {
    throw badUserInput("contentType must be audio/*");
  }
  if (!AUDIO_EXTENSION_RE.test(input.fileName)) {
    throw badUserInput(
      "file must be .mp3, .wav, .m4a, .aac, or .ogg for library BGM",
    );
  }
  const timestamp = Date.now();
  const s3Key = `library/bgm/${timestamp}-${sanitizeFileName(input.fileName, "background-music.mp3")}`;
  const uploadUrl = await createSignedUploadUrlForS3({
    key: s3Key,
    contentType: input.contentType,
  });

  return {
    uploadUrl,
    s3Key,
    fileName: s3Key.split("/").pop() ?? input.fileName,
    contentType: input.contentType,
  };
};
