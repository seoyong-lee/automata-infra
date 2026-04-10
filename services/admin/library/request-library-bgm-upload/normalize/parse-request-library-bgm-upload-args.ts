import { z } from "zod";
import { badUserInput } from "../../../shared/errors";

const nonEmpty = z.string().trim().min(1);

export const requestLibraryBgmUploadInputSchema = z
  .object({
    fileName: nonEmpty,
    contentType: nonEmpty,
  })
  .strict();

export type RequestLibraryBgmUploadInput = z.infer<
  typeof requestLibraryBgmUploadInputSchema
>;

export const parseRequestLibraryBgmUploadArgs = (
  args: Record<string, unknown>,
): RequestLibraryBgmUploadInput => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;
  if (!input) {
    throw badUserInput("input is required");
  }
  try {
    return requestLibraryBgmUploadInputSchema.parse(input);
  } catch {
    throw badUserInput("requestLibraryBgmUpload input is invalid");
  }
};
