import { updateContentRecord } from "../repo/update-content";
import type { UpdateContentInputDto } from "../../shared/types";

export const updateAdminContent = async (input: {
  draft: UpdateContentInputDto;
  actor: string;
}) => {
  return updateContentRecord({
    draft: input.draft,
    now: new Date().toISOString(),
    actor: input.actor,
  });
};
