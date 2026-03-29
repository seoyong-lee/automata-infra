export const buildJobBriefKey = (jobId: string): string => {
  return `drafts/${jobId}/job-brief.json`;
};

export const buildContentBriefKey = (jobId: string): string => {
  return `drafts/${jobId}/content-brief.json`;
};

export const buildJobPlanKey = (jobId: string): string => {
  return `plans/${jobId}/job-plan.json`;
};
