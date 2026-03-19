import { putBufferToS3 } from "../../../shared/lib/aws/runtime";
import {
  putRenderArtifact,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";

type CompositionResult = {
  finalVideoS3Key: string;
  thumbnailS3Key: string;
  previewS3Key: string;
  provider: string;
  providerRenderId?: string | null;
};

const storeRenderedArtifacts = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await putBufferToS3(
    composition.finalVideoS3Key,
    `final video placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.thumbnailS3Key,
    `thumbnail placeholder for ${jobId}`,
    "text/plain",
  );
  await putBufferToS3(
    composition.previewS3Key,
    `preview placeholder for ${jobId}`,
    "text/plain",
  );
};

export const persistComposition = async (
  jobId: string,
  composition: CompositionResult,
): Promise<void> => {
  await storeRenderedArtifacts(jobId, composition);

  await putRenderArtifact(jobId, {
    finalVideoS3Key: composition.finalVideoS3Key,
    thumbnailS3Key: composition.thumbnailS3Key,
    previewS3Key: composition.previewS3Key,
    provider: composition.provider,
    providerRenderId: composition.providerRenderId ?? null,
    createdAt: new Date().toISOString(),
  });

  await updateJobMeta(
    jobId,
    {
      finalVideoS3Key: composition.finalVideoS3Key,
      thumbnailS3Key: composition.thumbnailS3Key,
      previewS3Key: composition.previewS3Key,
    },
    "RENDERED",
  );
};
