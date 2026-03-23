import { badUserInput } from "../../shared/errors";
import type { SceneJson } from "../../../../../types/render/scene-json";

const expectString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const expectNullableString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const expectNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const expectOptionalBoolean = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw badUserInput(`${field} is invalid`);
  }
  return value;
};

const parseSceneJson = (value: unknown): SceneJson => {
  const root =
    typeof value === "string"
      ? (JSON.parse(value) as unknown)
      : (value as unknown);
  if (!root || typeof root !== "object") {
    throw badUserInput("sceneJson is invalid");
  }
  const record = root as Record<string, unknown>;
  const scenesRaw = record.scenes;
  if (!Array.isArray(scenesRaw)) {
    throw badUserInput("sceneJson.scenes is invalid");
  }
  return {
    videoTitle: expectString(record.videoTitle, "sceneJson.videoTitle"),
    language: expectString(record.language, "sceneJson.language"),
    scenes: scenesRaw.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw badUserInput(`sceneJson.scenes[${index}] is invalid`);
      }
      const scene = entry as Record<string, unknown>;
      const sfx = Array.isArray(scene.sfx)
        ? scene.sfx.map((item, sfxIndex) =>
            expectString(item, `sceneJson.scenes[${index}].sfx[${sfxIndex}]`),
          )
        : undefined;
      return {
        sceneId: expectNumber(
          scene.sceneId,
          `sceneJson.scenes[${index}].sceneId`,
        ),
        durationSec: expectNumber(
          scene.durationSec,
          `sceneJson.scenes[${index}].durationSec`,
        ),
        narration: expectNullableString(
          scene.narration,
          `sceneJson.scenes[${index}].narration`,
        ),
        disableNarration: expectOptionalBoolean(
          scene.disableNarration,
          `sceneJson.scenes[${index}].disableNarration`,
        ),
        imagePrompt: expectString(
          scene.imagePrompt,
          `sceneJson.scenes[${index}].imagePrompt`,
        ),
        videoPrompt:
          typeof scene.videoPrompt === "string" ? scene.videoPrompt : undefined,
        subtitle: expectString(
          scene.subtitle,
          `sceneJson.scenes[${index}].subtitle`,
        ),
        bgmMood: typeof scene.bgmMood === "string" ? scene.bgmMood : undefined,
        sfx,
      };
    }),
  };
};

export const parseUpdateSceneJsonArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  const jobId = expectString(input.jobId, "jobId").trim();
  const sceneJson = parseSceneJson(input.sceneJson);
  return { jobId, sceneJson };
};
