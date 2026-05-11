import { badUserInput } from "../../../../admin/shared/errors";

const ASSET_UPLOAD_CATEGORIES = new Set([
  "BACKGROUND_MUSIC",
  "REFERENCE_IMAGE",
  "SCENE_IMAGE",
  "SCENE_VOICE",
  "SCENE_VIDEO",
  "JOB_MASTER_VIDEO",
] as const);

export type AssetUploadCategory =
  | "BACKGROUND_MUSIC"
  | "REFERENCE_IMAGE"
  | "SCENE_IMAGE"
  | "SCENE_VOICE"
  | "SCENE_VIDEO"
  | "JOB_MASTER_VIDEO";

export type ParsedRequestAssetUploadArgs = {
  jobId: string;
  fileName: string;
  contentType: string;
  category: AssetUploadCategory;
  targetSceneId?: number;
};

const parseInputObject = (
  args: Record<string, unknown>,
): Record<string, unknown> => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  return input;
};

const requireTrimmedString = (
  input: Record<string, unknown>,
  key: "jobId" | "fileName" | "contentType",
): string => {
  const raw = input[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    throw badUserInput(`${key} is required`);
  }
  return value;
};

const parseCategory = (input: Record<string, unknown>): AssetUploadCategory => {
  const categoryRaw =
    typeof input.category === "string" ? input.category.trim() : "";
  if (!ASSET_UPLOAD_CATEGORIES.has(categoryRaw as AssetUploadCategory)) {
    throw badUserInput("category is invalid");
  }
  return categoryRaw as AssetUploadCategory;
};

const parseTargetSceneId = (
  input: Record<string, unknown>,
): number | undefined => {
  return typeof input.targetSceneId === "number" &&
    Number.isInteger(input.targetSceneId)
    ? input.targetSceneId
    : undefined;
};

export const parseRequestAssetUploadArgs = (
  args: Record<string, unknown>,
): ParsedRequestAssetUploadArgs => {
  const input = parseInputObject(args);
  const jobId = requireTrimmedString(input, "jobId");
  const fileName = requireTrimmedString(input, "fileName");
  const contentType = requireTrimmedString(input, "contentType");
  const category = parseCategory(input);
  const targetSceneId = parseTargetSceneId(input);

  return {
    jobId,
    fileName,
    contentType,
    category,
    ...(targetSceneId !== undefined ? { targetSceneId } : {}),
  };
};
