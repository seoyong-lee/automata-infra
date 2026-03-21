import { listAdminContents } from "../repo/list-contents";

export const listContentsUsecase = async (input: {
  limit: number;
  nextToken?: string;
}) => {
  return listAdminContents(input);
};
