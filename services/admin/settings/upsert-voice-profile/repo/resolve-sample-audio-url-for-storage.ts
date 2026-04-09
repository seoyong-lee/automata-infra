import { putBufferToS3 } from "../../../../shared/lib/aws/runtime";
import { buildPreviewAssetUrl } from "../../../../shared/lib/asset-url";
import { badUserInput } from "../../../shared/errors";

const DATA_URL_BASE64_RE = /^data:([^;,]+);base64,([\s\S]*)$/i;

const MAX_DECODED_SAMPLE_BYTES = 15 * 1024 * 1024;
/** Dynamo 문자열·외부 URL만 허용할 때 상한 (인라인 base64는 S3로 보냄) */
const MAX_PLAIN_URL_LENGTH = 4096;

const mimeToFileExtension = (mime: string): string => {
  const normalized = mime.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return "mp3";
  }
  if (normalized.includes("wav")) {
    return "wav";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("ogg")) {
    return "ogg";
  }
  if (normalized.includes("mp4") || normalized.includes("aac")) {
    return "m4a";
  }
  return "mp3";
};

const assertAllowedSampleMime = (mime: string): void => {
  const base = mime.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    base.startsWith("audio/") ||
    base === "application/octet-stream" ||
    base === ""
  ) {
    return;
  }
  throw badUserInput(`unsupported sample audio type: ${base || mime}`);
};

const decodeDataUrlBase64ToBuffer = (
  mimePart: string,
  b64Raw: string,
): Buffer => {
  assertAllowedSampleMime(mimePart);
  const b64 = b64Raw.replace(/\s/g, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    throw badUserInput("invalid sample audio base64 data");
  }
  if (buffer.length === 0) {
    throw badUserInput("sample audio is empty");
  }
  if (buffer.length > MAX_DECODED_SAMPLE_BYTES) {
    throw badUserInput(
      `sample audio exceeds maximum size (${MAX_DECODED_SAMPLE_BYTES} bytes)`,
    );
  }
  return buffer;
};

const persistInlineSampleToS3 = async (input: {
  profileId: string;
  mimePart: string;
  buffer: Buffer;
}): Promise<string> => {
  const ext = mimeToFileExtension(input.mimePart || "audio/mpeg");
  const contentType =
    input.mimePart && input.mimePart.length > 0 ? input.mimePart : "audio/mpeg";
  const key = `config/voice-profiles/${input.profileId}/sample.${ext}`;
  await putBufferToS3(key, input.buffer, contentType);
  return buildPreviewAssetUrl(key) ?? key;
};

const resolvePlainSampleReference = (raw: string): string => {
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (raw.length > MAX_PLAIN_URL_LENGTH) {
      throw badUserInput("sampleAudioUrl is too long");
    }
    return raw;
  }
  if (raw.length > MAX_PLAIN_URL_LENGTH) {
    throw badUserInput(
      "sample audio is too large to store inline; use a data URL so it can be uploaded to storage, or provide an https URL",
    );
  }
  return raw;
};

/**
 * data:…;base64,… 인라인 오디오는 S3에 올리고 미리보기 URL(또는 키)만 반환한다.
 * http(s) URL·짧은 문자열은 그대로 둔다.
 */
export const resolveSampleAudioUrlForStorage = async (input: {
  profileId: string;
  sampleAudioUrl?: string;
}): Promise<string | undefined> => {
  const raw = input.sampleAudioUrl?.trim();
  if (!raw) {
    return undefined;
  }

  const match = DATA_URL_BASE64_RE.exec(raw);
  if (!match) {
    return resolvePlainSampleReference(raw);
  }

  const mimePart = match[1]?.trim() ?? "";
  const b64Raw = match[2] ?? "";
  const buffer = decodeDataUrlBase64ToBuffer(mimePart, b64Raw);
  return persistInlineSampleToS3({
    profileId: input.profileId,
    mimePart,
    buffer,
  });
};
