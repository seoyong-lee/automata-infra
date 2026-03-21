import { createContentRecord } from "../repo/create-content";
import type { CreateContentInputDto } from "../../shared/types";

export const createAdminContent = async (input: {
  draft: CreateContentInputDto;
  actor: string;
}) => {
  return createContentRecord({
    draft: input.draft,
    now: new Date().toISOString(),
    actor: input.actor,
  });
};
