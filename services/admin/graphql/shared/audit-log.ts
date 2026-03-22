type AuditOperation =
  | "submitReviewDecision"
  | "requestUpload"
  | "approvePipelineExecution"
  | "enqueueToChannelPublishQueue"
  | "channelPublishQueue"
  | "platformConnections"
  | "attachJobToContent"
  | "adminJobs"
  | "adminJob"
  | "pendingReviews"
  | "jobTimeline"
  | "jobExecutions"
  | "jobDraft"
  | "llmSettings"
  | "updateLlmStepSettings"
  | "createDraftJob"
  | "updateTopicSeed"
  | "runTopicPlan"
  | "runSceneJson"
  | "updateSceneJson"
  | "runAssetGeneration"
  | "deleteJob"
  | "createContent"
  | "updateContent"
  | "deleteContent"
  | "adminContents";

type ResolverAuditLogInput = {
  operation: AuditOperation;
  operationType: "query" | "mutation";
  phase: "started" | "succeeded" | "failed";
  actor: string;
  jobId?: string;
  action?: string;
  errorCode?: string;
  errorMessage?: string;
  /** 매핑 전 원본 에러 메시지(디버깅). */
  errorCause?: string;
};

export const logResolverAudit = (input: ResolverAuditLogInput): void => {
  console.info(
    JSON.stringify({
      event: "admin_graphql_audit",
      timestamp: new Date().toISOString(),
      ...input,
    }),
  );
};
