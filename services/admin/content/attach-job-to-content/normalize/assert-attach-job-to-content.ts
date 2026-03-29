import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { badUserInput } from "../../../shared/errors";

const isUnattached = (contentId: string | undefined): boolean => {
  return contentId === undefined || contentId === ADMIN_UNASSIGNED_CONTENT_ID;
};

export const assertAttachableContentId = (contentId: string): void => {
  if (contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("cannot attach to reserved content id");
  }
};

export const assertJobCanAttachToContent = (
  currentContentId: string | undefined,
): void => {
  if (!isUnattached(currentContentId)) {
    throw badUserInput(
      "이미 채널에 연결된 제작 아이템은 다른 채널로 옮기거나 중복 연결할 수 없습니다.",
    );
  }
};
