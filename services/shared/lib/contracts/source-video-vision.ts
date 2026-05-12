import { z } from "zod";
import { getOptionalEnv } from "../aws/runtime-env";

/** 비용 최적화 기본: Gemini Flash-Lite (멀티모달, 저단가). */
export const DEFAULT_GEMINI_VISION_MODEL = "gemini-2.5-flash-lite";

export const sourceVideoVisionProviderSchema = z.enum(["AUTO", "GEMINI", "BEDROCK"]);
export type SourceVideoVisionProvider = z.infer<
  typeof sourceVideoVisionProviderSchema
>;

const normalizeEnvProvider = (raw: string | undefined): SourceVideoVisionProvider => {
  const v = (raw ?? "AUTO").trim().toUpperCase();
  if (v === "GEMINI") {
    return "GEMINI";
  }
  if (v === "BEDROCK" || v === "ANTHROPIC") {
    return "BEDROCK";
  }
  return "AUTO";
};

const pickConfiguredProvider = (
  override: SourceVideoVisionProvider | undefined,
): SourceVideoVisionProvider => {
  if (override === "GEMINI" || override === "BEDROCK") {
    return override;
  }
  return normalizeEnvProvider(process.env.SOURCE_VIDEO_VISION_PROVIDER?.trim());
};

/**
 * 뮤테이션 `visionProvider` → 없으면 `SOURCE_VIDEO_VISION_PROVIDER` → AUTO면 시크릿 유무로 GEMINI|BEDROCK.
 */
export const resolveEffectiveSourceVideoVisionProvider = (input?: {
  override?: SourceVideoVisionProvider;
}): "GEMINI" | "BEDROCK" => {
  const base = pickConfiguredProvider(input?.override);
  if (base === "GEMINI") {
    return "GEMINI";
  }
  if (base === "BEDROCK") {
    return "BEDROCK";
  }
  const secretId = getOptionalEnv("GEMINI_VISION_SECRET_ID")?.trim();
  return secretId ? "GEMINI" : "BEDROCK";
};

export const assertGeminiVisionSecretConfigured = (): string => {
  const secretId = getOptionalEnv("GEMINI_VISION_SECRET_ID")?.trim();
  if (!secretId) {
    throw new Error(
      "GEMINI_VISION_SECRET_ID is not set; use Secrets Manager JSON { \"apiKey\": \"...\", \"model?\": \"gemini-2.5-flash-lite\" } or set visionProvider / SOURCE_VIDEO_VISION_PROVIDER to BEDROCK",
    );
  }
  return secretId;
};
