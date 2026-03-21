import { deleteContentCascade } from "../repo/delete-content";

export const deleteAdminContent = async (input: { contentId: string }) => {
  return deleteContentCascade(input.contentId);
};
