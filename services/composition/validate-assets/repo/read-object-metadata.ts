import { headObjectFromS3 } from "../../../shared/lib/aws/runtime";

export const readObjectMetadata = async (key: string) => {
  return headObjectFromS3(key);
};
