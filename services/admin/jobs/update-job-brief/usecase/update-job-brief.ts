import {
  getStoredContentBrief,
  getJobOrThrow,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import {
  saveContentBrief,
  saveJobBrief,
} from "../../../shared/repo/job-draft-write-store";
import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  buildPresetSnapshot,
  buildResolvedPolicy,
} from "../../../../shared/lib/contracts/content-presets";
import { getContentPresetOrThrow } from "../../../../shared/lib/store/content-presets";
import { getContentMeta } from "../../../../shared/lib/store/video-jobs";
import type {
  ContentBriefDto,
  JobBriefDto,
  UpdateJobBriefInputDto,
} from "../../../shared/types";

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
};

const pickFirstDefined = <T>(
  ...values: Array<T | undefined>
): T | undefined => {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const resolveRequestedPresetId = (input: {
  requestedPresetId?: string;
  existingJobBrief?: JobBriefDto;
  existingContentBrief?: ContentBriefDto;
}): string | undefined => {
  return pickFirstDefined(
    input.requestedPresetId,
    input.existingJobBrief?.presetId,
    input.existingContentBrief?.presetId,
  );
};

const resolveRequestedStylePreset = (input: {
  requestedStylePreset?: string;
  existingJobBrief?: JobBriefDto;
  existingContentBrief?: ContentBriefDto;
}): string | undefined => {
  return pickFirstDefined(
    input.requestedStylePreset,
    input.existingJobBrief?.stylePreset,
    input.existingContentBrief?.stylePreset,
  );
};

const resolveExistingPresetSnapshot = (input: {
  existingJobBrief?: JobBriefDto;
  existingContentBrief?: ContentBriefDto;
}) => {
  return pickFirstDefined(
    input.existingJobBrief?.presetSnapshot,
    input.existingContentBrief?.presetSnapshot,
  );
};

const resolveExistingPolicy = (input: {
  existingJobBrief?: JobBriefDto;
  existingContentBrief?: ContentBriefDto;
}) => {
  return pickFirstDefined(
    input.existingJobBrief?.resolvedPolicy,
    input.existingContentBrief?.resolvedPolicy,
  );
};

const resolvePresetState = async (input: {
  requestedPresetId?: string;
  requestedStylePreset?: string;
  existingJobBrief?: JobBriefDto;
  existingContentBrief?: ContentBriefDto;
}) => {
  const presetId = resolveRequestedPresetId(input);
  const stylePreset = resolveRequestedStylePreset(input);
  if (!presetId) {
    return {
      presetId: undefined,
      presetSnapshot: resolveExistingPresetSnapshot(input),
      resolvedPolicy: resolveExistingPolicy(input),
      stylePreset,
    };
  }

  const preset = await getContentPresetOrThrow(presetId);
  const presetSnapshot = buildPresetSnapshot(preset);
  const resolvedPolicy = buildResolvedPolicy(presetSnapshot, {
    stylePreset,
  });
  return {
    presetId,
    presetSnapshot,
    resolvedPolicy,
    stylePreset: resolvedPolicy.stylePreset,
  };
};

const resolveContentAudience = async (
  contentId: string,
  fallback?: string,
): Promise<string> => {
  if (contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    return "미연결";
  }
  const content = await getContentMeta(contentId);
  return content?.label ?? fallback ?? "미연결";
};

const buildMergedJobBrief = (input: {
  existing?: JobBriefDto;
  requested: UpdateJobBriefInputDto;
  presetState: Awaited<ReturnType<typeof resolvePresetState>>;
}): JobBriefDto => {
  return {
    ...input.existing,
    ...input.requested,
    presetId: input.presetState.presetId,
    stylePreset:
      input.presetState.stylePreset ??
      input.requested.stylePreset ??
      input.existing?.stylePreset ??
      "default",
    presetSnapshot: input.presetState.presetSnapshot,
    resolvedPolicy: input.presetState.resolvedPolicy,
  };
};

const buildUpdatedContentBrief = async (input: {
  jobId: string;
  merged: JobBriefDto;
  existingContentBrief: ContentBriefDto;
  presetState: Awaited<ReturnType<typeof resolvePresetState>>;
}): Promise<ContentBriefDto> => {
  const audience = await resolveContentAudience(
    input.merged.contentId,
    input.existingContentBrief.seed.audience,
  );
  return {
    ...input.existingContentBrief,
    contentId: input.merged.contentId,
    presetId: input.presetState.presetId,
    language: input.merged.targetLanguage,
    targetPlatform:
      input.presetState.resolvedPolicy?.primaryPlatformPreset ??
      input.existingContentBrief.targetPlatform,
    targetDurationSec: input.merged.targetDurationSec,
    titleIdea: input.merged.titleIdea,
    stylePreset: input.merged.stylePreset,
    seed: {
      ...input.existingContentBrief.seed,
      audience,
      style: input.merged.stylePreset,
      ideaKey: normalizeSlug(input.merged.titleIdea),
    },
    constraints: {
      ...input.existingContentBrief.constraints,
      maxScenes:
        input.presetState.resolvedPolicy?.sceneCountMax ??
        input.existingContentBrief.constraints.maxScenes,
    },
    presetSnapshot: input.presetState.presetSnapshot,
    resolvedPolicy: input.presetState.resolvedPolicy,
  };
};

export const updateAdminJobBrief = async (input: {
  jobId: string;
  jobBrief: UpdateJobBriefInputDto;
}): Promise<JobBriefDto> => {
  const job = await getJobOrThrow(input.jobId);
  const [existing, existingContentBrief] = await Promise.all([
    getStoredJobBrief(job),
    getStoredContentBrief(job),
  ]);
  const presetState = await resolvePresetState({
    requestedPresetId: input.jobBrief.presetId,
    requestedStylePreset: input.jobBrief.stylePreset,
    existingJobBrief: existing,
    existingContentBrief,
  });
  const merged = buildMergedJobBrief({
    existing,
    requested: input.jobBrief,
    presetState,
  });
  await saveJobBrief({
    jobId: input.jobId,
    jobBrief: merged,
    status: "DRAFT",
  });
  if (existingContentBrief) {
    const updatedContentBrief = await buildUpdatedContentBrief({
      jobId: input.jobId,
      merged,
      existingContentBrief,
      presetState,
    });
    await saveContentBrief({
      jobId: input.jobId,
      contentBrief: updatedContentBrief,
      status: "DRAFT",
    });
  }
  return merged;
};
