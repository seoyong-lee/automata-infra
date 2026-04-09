import { createSignedUploadUrlForS3 } from "../../../../shared/lib/aws/runtime";
import { badUserInput } from "../../../../admin/shared/errors";
import { getJobOrThrow } from "../../../../admin/shared/repo/job-draft-store";
import type {
  AssetUploadCategory,
  ParsedRequestAssetUploadArgs,
} from "../normalize/parse-request-asset-upload-args";

const INVALID_FILE_CHARS_RE = /[^A-Za-z0-9._-]+/g;
const IMAGE_EXTENSION_RE = /\.(png|jpg|jpeg|webp)$/i;
const AUDIO_EXTENSION_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;
const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v)$/i;

const sanitizeFileName = (fileName: string, fallback: string): string => {
  const base = fileName.split("/").pop() ?? fileName;
  const normalized = base
    .replace(INVALID_FILE_CHARS_RE, "-")
    .replace(/-+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || fallback;
};

const validateContentType = (
  contentType: string,
  prefix: "image/" | "audio/" | "video/",
): void => {
  if (!contentType.toLowerCase().startsWith(prefix)) {
    throw badUserInput(`contentType must be ${prefix}*`);
  }
};

const requireSceneId = (sceneId: number | undefined): number => {
  if (
    sceneId === undefined ||
    !Number.isInteger(sceneId) ||
    sceneId < 0
  ) {
    throw badUserInput("targetSceneId must be a non-negative integer");
  }
  return sceneId;
};

const buildUploadKey = (input: ParsedRequestAssetUploadArgs): string => {
  const timestamp = Date.now();
  switch (input.category) {
    case "BACKGROUND_MUSIC":
      validateContentType(input.contentType, "audio/");
      if (!AUDIO_EXTENSION_RE.test(input.fileName)) {
        throw badUserInput(
          "background music must be .mp3, .wav, .m4a, .aac, or .ogg",
        );
      }
      return `assets/${input.jobId}/bgm/${timestamp}-${sanitizeFileName(input.fileName, "background-music.mp3")}`;
    case "REFERENCE_IMAGE":
      validateContentType(input.contentType, "image/");
      if (!IMAGE_EXTENSION_RE.test(input.fileName)) {
        throw badUserInput(
          "reference image must be .png, .jpg, .jpeg, or .webp",
        );
      }
      return `assets/${input.jobId}/reference-images/${timestamp}-${sanitizeFileName(input.fileName, "reference-image.png")}`;
    case "SCENE_IMAGE": {
      const sceneId = requireSceneId(input.targetSceneId);
      validateContentType(input.contentType, "image/");
      if (!IMAGE_EXTENSION_RE.test(input.fileName)) {
        throw badUserInput("scene image must be .png, .jpg, .jpeg, or .webp");
      }
      return `assets/${input.jobId}/manual/image/scene-${sceneId}/${timestamp}-${sanitizeFileName(input.fileName, "scene-image.png")}`;
    }
    case "SCENE_VOICE": {
      const sceneId = requireSceneId(input.targetSceneId);
      validateContentType(input.contentType, "audio/");
      if (!AUDIO_EXTENSION_RE.test(input.fileName)) {
        throw badUserInput(
          "scene voice must be .mp3, .wav, .m4a, .aac, or .ogg",
        );
      }
      return `assets/${input.jobId}/manual/voice/scene-${sceneId}/${timestamp}-${sanitizeFileName(input.fileName, "scene-voice.mp3")}`;
    }
    case "SCENE_VIDEO": {
      const sceneId = requireSceneId(input.targetSceneId);
      validateContentType(input.contentType, "video/");
      if (!VIDEO_EXTENSION_RE.test(input.fileName)) {
        throw badUserInput("scene video must be .mp4, .mov, .webm, or .m4v");
      }
      return `assets/${input.jobId}/manual/video/scene-${sceneId}/${timestamp}-${sanitizeFileName(input.fileName, "scene-video.mp4")}`;
    }
    default: {
      const _exhaustive: never = input.category;
      throw new Error(`unsupported asset upload category: ${_exhaustive}`);
    }
  }
};

export const requestAssetUpload = async (
  input: ParsedRequestAssetUploadArgs,
): Promise<{
  uploadUrl: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  category: AssetUploadCategory;
}> => {
  await getJobOrThrow(input.jobId);
  const s3Key = buildUploadKey(input);
  const uploadUrl = await createSignedUploadUrlForS3({
    key: s3Key,
    contentType: input.contentType,
  });

  return {
    uploadUrl,
    s3Key,
    fileName: s3Key.split("/").pop() ?? input.fileName,
    contentType: input.contentType,
    category: input.category,
  };
};
