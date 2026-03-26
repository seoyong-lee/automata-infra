import { ZodError } from "zod";
import {
  updateSceneJsonInputSchema,
  type UpdateSceneJsonInput,
} from "../../../../shared/lib/contracts/canonical-io-schemas";
import { badUserInput } from "../../../shared/errors";

const normalizeSceneJsonPayload = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw badUserInput("sceneJson is invalid");
  }
};

export const parseUpdateSceneJsonArgs = (args: Record<string, unknown>) => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    const parsed: UpdateSceneJsonInput = updateSceneJsonInputSchema.parse({
      ...input,
      sceneJson: normalizeSceneJsonPayload(input.sceneJson),
    });
    return parsed;
  } catch (error) {
    if (error instanceof ZodError) {
      throw badUserInput(error.issues[0]?.message ?? "invalid input");
    }
    throw error;
  }
};
