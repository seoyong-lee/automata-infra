import { z } from "zod";

import {
  contentPublishDraftSchema,
  platformPublishProfileSchema,
  type ContentPublishDraft,
  type PlatformPublishProfile,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import {
  createSourceItem,
  getSourceItem,
  listSourceItemsForChannel,
  updateSourceItem,
} from "../../../shared/lib/store/source-items";
import {
  getPlatformPublishProfile,
  putPlatformPublishProfile,
} from "../../../shared/lib/store/publish-profile-store";
import {
  getContentPublishDraft,
  putContentPublishDraft,
} from "../../../shared/lib/store/publish-draft-store";
import { listPublishTargetsByJob } from "../../../shared/lib/store/publish-targets-job";
import { upsertPersistedPlatformConnection } from "../../../shared/lib/store/platform-connection-records";
import {
  getJobMeta,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../shared/mapper/map-job-meta-to-admin-job";
import { runPublishOrchestrationUsecase } from "./usecase/run-publish-orchestration";
import { badUserInput } from "../shared/errors";

const idArg = z.object({ id: z.string().trim().min(1) });
const channelArg = z.object({ channelId: z.string().trim().min(1) });
const jobArg = z.object({ jobId: z.string().trim().min(1) });

const createSourceItemInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    masterHook: z.string().optional(),
    sourceNotes: z.string().optional(),
  }),
});

const updateSourceItemInput = z.object({
  input: z.object({
    sourceItemId: z.string().trim().min(1),
    topic: z.string().optional(),
    masterHook: z.string().optional(),
    sourceNotes: z.string().optional(),
    status: z
      .enum(["IDEATING", "READY_FOR_DISTRIBUTION", "ARCHIVED"])
      .optional(),
  }),
});

const setJobSourceItemInput = z.object({
  input: z.object({
    jobId: z.string().trim().min(1),
    sourceItemId: z.string().trim().min(1),
  }),
});

const profileArgs = z.object({
  channelId: z.string().trim().min(1),
  platformConnectionId: z.string().trim().min(1),
});

const upsertPlatformConnectionInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    platformConnectionId: z.string().optional(),
    platform: z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM"]),
    accountId: z.string().trim().min(1),
    accountHandle: z.string().optional(),
    oauthAccountId: z.string().trim().min(1),
    status: z.enum(["CONNECTED", "EXPIRED", "ERROR", "DISCONNECTED"]),
  }),
});

const updatePlatformPublishProfileInput = z.object({
  input: z.object({
    channelId: z.string().trim().min(1),
    platformConnectionId: z.string().trim().min(1),
    profile: z.record(z.string(), z.unknown()),
  }),
});

const updateContentPublishDraftInput = z.object({
  input: z.object({
    draft: z.unknown(),
  }),
});

const runPublishOrchestrationInput = z.object({
  input: z.object({
    jobId: z.string().trim().min(1),
  }),
});

const mapSourceToGql = (row: Awaited<ReturnType<typeof getSourceItem>>) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    topic: row.topic,
    masterHook: row.masterHook ?? null,
    sourceNotes: row.sourceNotes ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

function mapYoutubeProfileSlice(yt: PlatformPublishProfile["youtube"]) {
  return {
    youtubeCategoryId: yt?.defaultCategoryId ?? null,
    youtubePlaylistIds: yt?.defaultPlaylistIds ?? [],
    youtubeTags: yt?.defaultTags ?? [],
  };
}

function mapPlatformPublishProfileToGql(p: PlatformPublishProfile) {
  const yt = p.youtube;
  const ig = p.instagram;
  const tt = p.tiktok;
  return {
    platformConnectionId: p.platformConnectionId,
    channelId: p.channelId,
    defaultVisibility: p.defaultVisibility ?? null,
    defaultLanguage: p.defaultLanguage ?? null,
    defaultHashtags: p.defaultHashtags,
    captionFooterTemplate: p.captionFooterTemplate ?? null,
    preferredSlots: p.preferredSlots ?? [],
    ...mapYoutubeProfileSlice(yt),
    tiktokDisclosureTemplate: tt?.disclosureTemplate ?? null,
    instagramFirstCommentTemplate: ig?.defaultFirstCommentTemplate ?? null,
  };
}

const mapContentPublishDraftToGql = (d: ContentPublishDraft) => ({
  channelContentItemId: d.channelContentItemId,
  globalDraft: d.globalDraft,
  platformDrafts: d.platformDrafts.map((p) => ({
    platform: p.platform,
    targetConnectionId: p.targetConnectionId,
    enabled: p.enabled,
    metadataJson: JSON.stringify(p.metadata),
    overrideFields: p.overrideFields ?? [],
    validationStatus: p.validationStatus ?? null,
  })),
});

async function handleSourceItem(rawArgs: Record<string, unknown>) {
  const { id } = idArg.parse(rawArgs);
  return mapSourceToGql(await getSourceItem(id));
}

async function handleSourceItemsForChannel(rawArgs: Record<string, unknown>) {
  const { channelId } = channelArg.parse(rawArgs);
  const rows = await listSourceItemsForChannel(channelId);
  return rows.map((r) => mapSourceToGql(r)!);
}

async function handleCreateSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = createSourceItemInput.parse(rawArgs);
  const row = await createSourceItem(input);
  return mapSourceToGql(row)!;
}

async function handleUpdateSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = updateSourceItemInput.parse(rawArgs);
  const row = await updateSourceItem(input);
  return mapSourceToGql(row)!;
}

async function handleSetJobSourceItem(rawArgs: Record<string, unknown>) {
  const { input } = setJobSourceItemInput.parse(rawArgs);
  await updateJobMeta(input.jobId, { sourceItemId: input.sourceItemId });
  const next = await getJobMeta(input.jobId);
  if (!next) {
    throw badUserInput("job not found");
  }
  return mapJobMetaToAdminJob(next);
}

async function handlePlatformPublishProfile(rawArgs: Record<string, unknown>) {
  const { channelId, platformConnectionId } = profileArgs.parse(rawArgs);
  const p = await getPlatformPublishProfile(channelId, platformConnectionId);
  if (!p) {
    return null;
  }
  return mapPlatformPublishProfileToGql(p);
}

async function handleUpsertPlatformConnection(
  rawArgs: Record<string, unknown>,
) {
  const { input } = upsertPlatformConnectionInput.parse(rawArgs);
  const row = await upsertPersistedPlatformConnection(input);
  const { PK: _pk, SK: _sk, updatedAt: _u, ...rest } = row;
  return {
    platformConnectionId: rest.platformConnectionId,
    channelId: rest.channelId,
    platform: rest.platform,
    accountId: rest.accountId,
    accountHandle: rest.accountHandle ?? null,
    oauthAccountId: rest.oauthAccountId,
    status: rest.status,
    connectedAt: rest.connectedAt,
    lastSyncedAt: rest.lastSyncedAt ?? null,
  };
}

async function handleUpdatePlatformPublishProfile(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updatePlatformPublishProfileInput.parse(rawArgs);
  const merged = platformPublishProfileSchema.parse({
    ...(input.profile as Record<string, unknown>),
    platformConnectionId: input.platformConnectionId,
    channelId: input.channelId,
  });
  const saved = await putPlatformPublishProfile(merged);
  return mapPlatformPublishProfileToGql(saved);
}

async function handleContentPublishDraft(rawArgs: Record<string, unknown>) {
  const { jobId } = jobArg.parse(rawArgs);
  const d = await getContentPublishDraft(jobId);
  if (!d) {
    return null;
  }
  return mapContentPublishDraftToGql(d);
}

async function handleUpdateContentPublishDraft(
  rawArgs: Record<string, unknown>,
) {
  const { input } = updateContentPublishDraftInput.parse(rawArgs);
  const draft = contentPublishDraftSchema.parse(
    input.draft as Record<string, unknown>,
  );
  const saved = await putContentPublishDraft(draft);
  return mapContentPublishDraftToGql(saved);
}

async function handlePublishTargetsForJob(rawArgs: Record<string, unknown>) {
  const { jobId } = jobArg.parse(rawArgs);
  const rows = await listPublishTargetsByJob(jobId);
  return rows.map((t) => ({
    publishTargetId: t.publishTargetId,
    channelContentItemId: t.channelContentItemId,
    platformConnectionId: t.platformConnectionId,
    platform: t.platform,
    status: t.status,
    scheduledAt: t.scheduledAt ?? null,
    externalPostId: t.externalPostId ?? null,
    externalUrl: t.externalUrl ?? null,
    publishError: t.publishError ?? null,
  }));
}

async function handleRunPublishOrchestration(rawArgs: Record<string, unknown>) {
  const { input } = runPublishOrchestrationInput.parse(rawArgs);
  return runPublishOrchestrationUsecase(input);
}

const publishDomainHandlers: Record<
  string,
  (raw: Record<string, unknown>) => Promise<unknown>
> = {
  sourceItem: handleSourceItem,
  sourceItemsForChannel: handleSourceItemsForChannel,
  createSourceItem: handleCreateSourceItem,
  updateSourceItem: handleUpdateSourceItem,
  setJobSourceItem: handleSetJobSourceItem,
  platformPublishProfile: handlePlatformPublishProfile,
  upsertPlatformConnection: handleUpsertPlatformConnection,
  updatePlatformPublishProfile: handleUpdatePlatformPublishProfile,
  contentPublishDraft: handleContentPublishDraft,
  updateContentPublishDraft: handleUpdateContentPublishDraft,
  publishTargetsForJob: handlePublishTargetsForJob,
  runPublishOrchestration: handleRunPublishOrchestration,
};

export const routePublishDomain = async (
  fieldName: string | undefined,
  rawArgs: Record<string, unknown>,
): Promise<unknown> => {
  const run = fieldName ? publishDomainHandlers[fieldName] : undefined;
  if (!run) {
    throw badUserInput(`unknown publish domain field: ${fieldName ?? ""}`);
  }
  return run(rawArgs);
};
