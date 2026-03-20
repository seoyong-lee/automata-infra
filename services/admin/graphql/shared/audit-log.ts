type AuditOperation =
  | "submitReviewDecision"
  | "requestUpload"
  | "adminJobs"
  | "adminJob"
  | "pendingReviews"
  | "jobTimeline"
  | "jobDraft"
  | "llmSettings"
  | "updateLlmStepSettings"
  | "createDraftJob"
  | "updateTopicSeed"
  | "runTopicPlan"
  | "runSceneJson"
  | "updateSceneJson"
  | "runAssetGeneration";

type ResolverAuditLogInput = {
  operation: AuditOperation;
  operationType: "query" | "mutation";
  phase: "started" | "succeeded" | "failed";
  actor: string;
  jobId?: string;
  action?: string;
  errorCode?: string;
  errorMessage?: string;
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
