import {
  gsi2PkForContentId,
  type JobMetaItem,
} from "../../shared/lib/store/video-jobs";
import { JobPlanResult } from "../usecase/create-job-plan";

export const mapJobPlanJobMeta = (result: JobPlanResult): JobMetaItem => {
  return {
    PK: `JOB#${result.jobId}`,
    SK: "META",
    jobId: result.jobId,
    contentId: result.contentId,
    contentType: result.contentType,
    variant: result.variant,
    status: "PLANNED",
    autoPublish: result.autoPublish,
    publishAt: result.publishAt,
    language: result.targetLanguage,
    targetDurationSec: result.targetDurationSec,
    videoTitle: result.titleIdea,
    estimatedCost: 0,
    providerCosts: {},
    reviewMode: true,
    retryCount: 0,
    lastError: null,
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
    GSI1PK: "STATUS#PLANNED",
    GSI1SK: result.createdAt,
    GSI2PK: gsi2PkForContentId(result.contentId),
    GSI2SK: `${result.createdAt}#JOB#${result.jobId}`,
    GSI4PK: result.contentType ? `CONTENT#${result.contentType}` : undefined,
    GSI4SK: result.contentType
      ? `${result.createdAt}#JOB#${result.jobId}`
      : undefined,
  };
};
