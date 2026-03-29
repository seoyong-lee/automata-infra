import { loadPlanConfig } from "../normalize/load-plan-config";
import type {
  CreateJobPlanDeps,
  JobBriefOverrides,
} from "./create-job-plan-types";

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
};

export const resolveJobId = (
  createdAt: string,
  jobId?: string,
  jobBrief?: JobBriefOverrides,
): string => {
  if (jobId) {
    return jobId;
  }
  if (jobBrief?.contentType && jobBrief.variant) {
    return `job_${createdAt.slice(0, 10).replace(/-/g, "")}_${normalizeSlug(jobBrief.contentType)}_${normalizeSlug(jobBrief.variant)}`;
  }
  return `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
};

export const resolvePlanContext = (deps: CreateJobPlanDeps) => {
  const configured = (deps.loadConfig ?? loadPlanConfig)();
  return {
    contentId: deps.jobBrief?.contentId ?? configured.contentId,
    targetLanguage: deps.jobBrief?.targetLanguage ?? configured.targetLanguage,
  };
};
