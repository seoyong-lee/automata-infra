import { randomUUID } from "crypto";
import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  ADMIN_UNASSIGNED_CONTENT_ID,
  parseContentBrief,
} from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  buildPresetSnapshot,
  buildResolvedPolicy,
} from "../../../../shared/lib/contracts/content-presets";
import { getContentPresetOrThrow } from "../../../../shared/lib/store/content-presets";
import {
  getContentMeta,
  gsi2PkForContentId,
  putJobMeta,
  type JobMetaItem,
} from "../../../../shared/lib/store/video-jobs";
import {
  buildContentBriefKey,
  buildJobBriefKey,
} from "../../../shared/repo/job-draft-keys";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import type {
  ContentBriefDto,
  CreateDraftJobInputDto,
  JobBriefDto,
} from "../../../shared/types";
import { notFound } from "../../../shared/errors";

const LEGACY_CONTENT_TYPE = "default";
const LEGACY_VARIANT = "default";

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
};

/** 타임스탬프 조합 없이 UUID만 사용 (충돌 확률 무시 가능 수준). */
const buildJobId = (): string => {
  return `job_${randomUUID().replace(/-/g, "")}`;
};

const buildJobBrief = (input: {
  draft: CreateDraftJobInputDto;
  contentId: string;
  stylePreset: string;
  presetSnapshot: JobBriefDto["presetSnapshot"];
  resolvedPolicy: JobBriefDto["resolvedPolicy"];
}): JobBriefDto => {
  return {
    contentId: input.contentId,
    presetId: input.draft.presetId,
    targetLanguage: input.draft.targetLanguage,
    titleIdea: input.draft.titleIdea,
    targetDurationSec: input.draft.targetDurationSec,
    stylePreset: input.stylePreset,
    ...(input.draft.creativeBrief !== undefined &&
    input.draft.creativeBrief !== ""
      ? { creativeBrief: input.draft.creativeBrief }
      : {}),
    ...(input.presetSnapshot ? { presetSnapshot: input.presetSnapshot } : {}),
    ...(input.resolvedPolicy ? { resolvedPolicy: input.resolvedPolicy } : {}),
    ...(input.resolvedPolicy?.renderSettings
      ? { renderSettings: input.resolvedPolicy.renderSettings }
      : {}),
  };
};

const buildContentBrief = (input: {
  draft: CreateDraftJobInputDto;
  jobId: string;
  now: string;
  contentId: string;
  contentLabel: string;
  stylePreset: string;
  presetSnapshot: ContentBriefDto["presetSnapshot"];
  resolvedPolicy: ContentBriefDto["resolvedPolicy"];
}): ContentBriefDto => {
  const date = input.now.slice(0, 10);
  return parseContentBrief({
    jobId: input.jobId,
    contentType: LEGACY_CONTENT_TYPE,
    variant: LEGACY_VARIANT,
    contentId: input.contentId,
    presetId: input.draft.presetId,
    language: input.draft.targetLanguage,
    targetPlatform:
      input.resolvedPolicy?.primaryPlatformPreset ?? "youtube-shorts",
    targetDurationSec: input.draft.targetDurationSec,
    titleIdea: input.draft.titleIdea,
    stylePreset: input.stylePreset,
    autoPublish: input.draft.autoPublish ?? false,
    publishAt: input.draft.publishAt,
    seed: {
      date,
      fortuneType: LEGACY_CONTENT_TYPE,
      audience: input.contentLabel,
      style: input.stylePreset,
      tone: "default",
      ideaKey: normalizeSlug(input.draft.titleIdea),
    },
    constraints: {
      maxScenes: input.resolvedPolicy?.sceneCountMax ?? 5,
      mustHaveHook: true,
      mustHaveCTA: true,
      safetyLevel: "default",
      noMedicalOrLegalClaims: true,
    },
    ...(input.presetSnapshot ? { presetSnapshot: input.presetSnapshot } : {}),
    ...(input.resolvedPolicy ? { resolvedPolicy: input.resolvedPolicy } : {}),
  });
};

const resolvePresetSelection = async (input: {
  draft: CreateDraftJobInputDto;
}) => {
  const preset = await getContentPresetOrThrow(input.draft.presetId);
  const presetSnapshot = buildPresetSnapshot(preset);
  const resolvedPolicy = buildResolvedPolicy(presetSnapshot, {
    stylePreset: input.draft.stylePreset,
  });

  return {
    preset,
    presetSnapshot,
    resolvedPolicy,
    stylePreset: resolvedPolicy.stylePreset,
  };
};

const resolveDraftContent = async (requested?: string) => {
  const useUnassigned =
    requested === undefined || requested === ADMIN_UNASSIGNED_CONTENT_ID;
  const parent = useUnassigned ? null : await getContentMeta(requested);
  if (!useUnassigned && !parent) {
    throw notFound("content not found");
  }

  return {
    contentId: parent?.contentId ?? ADMIN_UNASSIGNED_CONTENT_ID,
    contentLabel: parent?.label ?? "미연결",
  };
};

const buildJobMetaItem = (input: {
  jobId: string;
  now: string;
  draft: CreateDraftJobInputDto;
  contentId: string;
  jobBrief: JobBriefDto;
  jobBriefS3Key: string;
  contentBriefS3Key: string;
  presetSnapshot: NonNullable<JobBriefDto["presetSnapshot"]>;
  resolvedPolicy: NonNullable<JobBriefDto["resolvedPolicy"]>;
}): JobMetaItem => {
  return {
    PK: `JOB#${input.jobId}`,
    SK: "META",
    jobId: input.jobId,
    contentType: LEGACY_CONTENT_TYPE,
    variant: LEGACY_VARIANT,
    contentId: input.contentId,
    presetId: input.draft.presetId,
    presetFormat: input.presetSnapshot.format,
    presetDuration: input.presetSnapshot.duration,
    presetPlatformPreset: input.resolvedPolicy.primaryPlatformPreset,
    status: "DRAFT",
    autoPublish: input.draft.autoPublish ?? false,
    publishAt: input.draft.publishAt,
    language: input.jobBrief.targetLanguage,
    targetDurationSec: input.jobBrief.targetDurationSec,
    videoTitle: input.jobBrief.titleIdea,
    estimatedCost: 0,
    providerCosts: {},
    reviewMode: true,
    retryCount: 0,
    lastError: null,
    contentBriefS3Key: input.contentBriefS3Key,
    jobBriefS3Key: input.jobBriefS3Key,
    createdAt: input.now,
    updatedAt: input.now,
    GSI1PK: "STATUS#DRAFT",
    GSI1SK: input.now,
    GSI2PK: gsi2PkForContentId(input.contentId),
    GSI2SK: `${input.now}#JOB#${input.jobId}`,
    GSI4PK: `CONTENT#${LEGACY_CONTENT_TYPE}`,
    GSI4SK: `${input.now}#JOB#${input.jobId}`,
    GSI5PK: `CONTENT#${input.contentId}`,
    GSI5SK: `${input.now}#JOB#${input.jobId}`,
  };
};

export const createDraftJob = async (input: {
  draft: CreateDraftJobInputDto;
  now: string;
}) => {
  const { contentId, contentLabel } = await resolveDraftContent(
    input.draft.contentId,
  );
  const jobId = buildJobId();
  const { presetSnapshot, resolvedPolicy, stylePreset } =
    await resolvePresetSelection({
      draft: input.draft,
    });
  const jobBrief = buildJobBrief({
    draft: input.draft,
    contentId,
    stylePreset,
    presetSnapshot,
    resolvedPolicy,
  });
  const contentBrief = buildContentBrief({
    draft: input.draft,
    jobId,
    now: input.now,
    contentId,
    contentLabel,
    stylePreset,
    presetSnapshot,
    resolvedPolicy,
  });
  const jobBriefS3Key = buildJobBriefKey(jobId);
  const contentBriefS3Key = buildContentBriefKey(jobId);
  await Promise.all([
    putJsonToS3(jobBriefS3Key, jobBrief),
    putJsonToS3(contentBriefS3Key, contentBrief),
  ]);

  const item = buildJobMetaItem({
    jobId,
    now: input.now,
    draft: input.draft,
    contentId,
    jobBrief,
    jobBriefS3Key,
    contentBriefS3Key,
    presetSnapshot,
    resolvedPolicy,
  });

  await putJobMeta(item);
  return mapJobMetaToAdminJob(item);
};
