import { deleteObjectFromS3 } from "../../../../shared/lib/aws/runtime";

const isJobScopedMediaKey = (jobId: string, key: string): boolean => {
  return (
    key.startsWith(`assets/${jobId}/`) || key.startsWith(`logs/${jobId}/`)
  );
};

export const maybeDeleteSceneVideoS3Objects = async (input: {
  jobId: string;
  videoClipS3Key?: string;
  videoProviderLogS3Key?: string;
}): Promise<void> => {
  for (const key of [input.videoClipS3Key, input.videoProviderLogS3Key]) {
    if (typeof key !== "string" || key.length === 0) {
      continue;
    }
    if (!isJobScopedMediaKey(input.jobId, key)) {
      continue;
    }
    try {
      await deleteObjectFromS3(key);
    } catch {
      // best-effort
    }
  }
};
