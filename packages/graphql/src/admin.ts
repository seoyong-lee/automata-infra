import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { getGraphqlRuntime } from "./runtime";
import { gqlFetch } from "./client/fetcher";
import { UnauthorizedError } from "./client/errors";

export type AdminJob = {
  jobId: string;
  contentId?: string | null;
  status:
    | "DRAFT"
    | "PLANNING"
    | "PLANNED"
    | "SCENE_JSON_BUILDING"
    | "SCENE_JSON_READY"
    | "ASSET_GENERATING"
    | "ASSETS_READY"
    | "VALIDATING"
    | "RENDER_PLAN_READY"
    | "RENDERED"
    | "REVIEW_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "UPLOAD_QUEUED"
    | "UPLOADED"
    | "FAILED"
    | "METRICS_COLLECTED";
  reviewAction?: "PENDING" | "APPROVE" | "REJECT" | "REGENERATE" | null;
  topicId: string;
  contentType?: string | null;
  variant?: string | null;
  autoPublish?: boolean | null;
  publishAt?: string | null;
  language: string;
  targetDurationSec: number;
  retryCount: number;
  createdAt: string;
  videoTitle: string;
  sceneJsonS3Key?: string | null;
  renderPlanS3Key?: string | null;
  finalVideoS3Key?: string | null;
  thumbnailS3Key?: string | null;
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
  uploadStatus?: string | null;
  uploadVideoId?: string | null;
  contentBriefS3Key?: string | null;
  topicSeedS3Key?: string | null;
  topicS3Key?: string | null;
  updatedAt: string;
};

export type PendingReview = {
  jobId: string;
  status: AdminJob["status"];
  previewS3Key?: string | null;
  reviewRequestedAt?: string | null;
};

export type LlmProvider = "OPENAI" | "GEMINI" | "BEDROCK";

export type TopicSeed = {
  contentId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string | null;
};

export type ContentBrief = {
  jobId: string;
  contentType: string;
  variant: string;
  contentId: string;
  language: string;
  targetPlatform: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  autoPublish?: boolean | null;
  publishAt?: string | null;
  seed: {
    date: string;
    fortuneType: string;
    audience: string;
    style: string;
    tone: string;
    topicKey: string;
  };
  constraints: {
    maxScenes: number;
    mustHaveHook: boolean;
    mustHaveCTA: boolean;
    safetyLevel: "default" | "strict" | "relaxed";
    noMedicalOrLegalClaims: boolean;
  };
};

export type SceneJsonScene = {
  sceneId: number;
  durationSec: number;
  narration: string;
  imagePrompt: string;
  videoPrompt?: string | null;
  subtitle: string;
  bgmMood?: string | null;
  sfx?: string[] | null;
};

export type SceneJsonPayload = {
  videoTitle: string;
  language: string;
  scenes: SceneJsonScene[];
};

export type SceneAsset = {
  sceneId: number;
  imageS3Key?: string | null;
  videoClipS3Key?: string | null;
  voiceS3Key?: string | null;
  durationSec?: number | null;
  narration?: string | null;
  subtitle?: string | null;
  imagePrompt?: string | null;
  videoPrompt?: string | null;
  validationStatus?: string | null;
};

export type JobDraftDetail = {
  job: AdminJob;
  contentBrief?: ContentBrief | null;
  topicSeed?: TopicSeed | null;
  topicPlan?: TopicSeed | null;
  sceneJson?: SceneJsonPayload | null;
  assets: SceneAsset[];
};

export type LlmStepSettings = {
  stepKey: string;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number | null;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  updatedAt: string;
  updatedBy: string;
};

export type Connection<T> = {
  items: T[];
  nextToken?: string | null;
};

/** 백엔드 `ADMIN_UNASSIGNED_CONTENT_ID`와 동기. 미연결 잡 전용 placeholder. */
export const ADMIN_UNASSIGNED_CONTENT_ID = "__unassigned__";

export type AdminContent = {
  contentId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  youtubeSecretName?: string | null;
  youtubeAccountType?: string | null;
  autoPublishEnabled?: boolean | null;
  defaultVisibility?: string | null;
  defaultCategoryId?: number | null;
  playlistId?: string | null;
  youtubeUpdatedAt?: string | null;
  youtubeUpdatedBy?: string | null;
};

const adminContentsQuery = `
  query AdminContents($limit: Int, $nextToken: String) {
    adminContents(limit: $limit, nextToken: $nextToken) {
      items {
        contentId
        label
        createdAt
        updatedAt
        youtubeSecretName
        youtubeAccountType
        autoPublishEnabled
        defaultVisibility
        defaultCategoryId
        playlistId
        youtubeUpdatedAt
        youtubeUpdatedBy
      }
      nextToken
    }
  }
`;

const adminJobsQuery = `
  query AdminJobs($status: JobStatus, $contentId: String, $limit: Int, $nextToken: String) {
    adminJobs(status: $status, contentId: $contentId, limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        contentId
        status
        reviewAction
        contentType
        variant
        autoPublish
        publishAt
        videoTitle
        targetDurationSec
        retryCount
        updatedAt
      }
      nextToken
    }
  }
`;

const pendingReviewsQuery = `
  query PendingReviews($limit: Int, $nextToken: String) {
    pendingReviews(limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        status
        previewS3Key
        reviewRequestedAt
      }
      nextToken
    }
  }
`;

const llmSettingsQuery = `
  query LlmSettings {
    llmSettings {
      items {
        stepKey
        provider
        model
        temperature
        maxOutputTokens
        secretIdEnvVar
        promptVersion
        systemPrompt
        userPrompt
        updatedAt
        updatedBy
      }
    }
  }
`;

const jobDraftQuery = `
  query JobDraft($jobId: ID!) {
    jobDraft(jobId: $jobId) {
      job {
        jobId
        contentId
        status
        reviewAction
        topicId
        contentType
        variant
        autoPublish
        publishAt
        language
        targetDurationSec
        retryCount
        createdAt
        updatedAt
        videoTitle
        sceneJsonS3Key
        renderPlanS3Key
        finalVideoS3Key
        thumbnailS3Key
        previewS3Key
        reviewRequestedAt
        uploadStatus
        uploadVideoId
        contentBriefS3Key
        topicSeedS3Key
        topicS3Key
      }
      contentBrief {
        jobId
        contentType
        variant
        contentId
        language
        targetPlatform
        targetDurationSec
        titleIdea
        stylePreset
        autoPublish
        publishAt
        seed {
          date
          fortuneType
          audience
          style
          tone
          topicKey
        }
        constraints {
          maxScenes
          mustHaveHook
          mustHaveCTA
          safetyLevel
          noMedicalOrLegalClaims
        }
      }
      topicSeed {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      topicPlan {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      sceneJson {
        videoTitle
        language
        scenes {
          sceneId
          durationSec
          narration
          imagePrompt
          videoPrompt
          subtitle
          bgmMood
          sfx
        }
      }
      assets {
        sceneId
        imageS3Key
        videoClipS3Key
        voiceS3Key
        durationSec
        narration
        subtitle
        imagePrompt
        videoPrompt
        validationStatus
      }
    }
  }
`;

const submitReviewMutation = `
  mutation SubmitReviewDecision($input: SubmitReviewDecisionInput!) {
    submitReviewDecision(input: $input) {
      ok
      jobId
      action
      regenerationScope
      status
    }
  }
`;

const requestUploadMutation = `
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      ok
      jobId
      status
      platform
    }
  }
`;

const updateLlmStepSettingsMutation = `
  mutation UpdateLlmStepSettings($input: UpdateLlmStepSettingsInput!) {
    updateLlmStepSettings(input: $input) {
      stepKey
      provider
      model
      temperature
      maxOutputTokens
      secretIdEnvVar
      promptVersion
      systemPrompt
      userPrompt
      updatedAt
      updatedBy
    }
  }
`;

const deleteJobMutation = `
  mutation DeleteJob($jobId: ID!) {
    deleteJob(jobId: $jobId) {
      ok
      jobId
    }
  }
`;

const createContentMutation = `
  mutation CreateContent($input: CreateContentInput!) {
    createContent(input: $input) {
      contentId
      label
      createdAt
      updatedAt
      youtubeSecretName
      youtubeAccountType
      autoPublishEnabled
      defaultVisibility
      defaultCategoryId
      playlistId
      youtubeUpdatedAt
      youtubeUpdatedBy
    }
  }
`;

const deleteContentMutation = `
  mutation DeleteContent($contentId: ID!) {
    deleteContent(contentId: $contentId) {
      ok
      contentId
    }
  }
`;

const updateContentMutation = `
  mutation UpdateContent($input: UpdateContentInput!) {
    updateContent(input: $input) {
      contentId
      label
      createdAt
      updatedAt
      youtubeSecretName
      youtubeAccountType
      autoPublishEnabled
      defaultVisibility
      defaultCategoryId
      playlistId
      youtubeUpdatedAt
      youtubeUpdatedBy
    }
  }
`;

const attachJobToContentMutation = `
  mutation AttachJobToContent($input: AttachJobToContentInput!) {
    attachJobToContent(input: $input) {
      jobId
      contentId
      status
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      updatedAt
      videoTitle
      contentBriefS3Key
      topicSeedS3Key
      topicS3Key
    }
  }
`;

const createDraftJobMutation = `
  mutation CreateDraftJob($input: CreateDraftJobInput!) {
    createDraftJob(input: $input) {
      jobId
      contentId
      status
      topicId
      contentType
      variant
      autoPublish
      publishAt
      language
      targetDurationSec
      retryCount
      createdAt
      updatedAt
      videoTitle
      contentBriefS3Key
      topicSeedS3Key
      topicS3Key
    }
  }
`;

const updateTopicSeedMutation = `
  mutation UpdateTopicSeed($input: UpdateTopicSeedInput!) {
    updateTopicSeed(input: $input) {
      contentId
      targetLanguage
      titleIdea
      targetDurationSec
      stylePreset
    }
  }
`;

const runTopicPlanMutation = `
  mutation RunTopicPlan($input: RunTopicPlanInput!) {
    runTopicPlan(input: $input) {
      jobId
      status
      updatedAt
      topicS3Key
      videoTitle
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
    }
  }
`;

const runSceneJsonMutation = `
  mutation RunSceneJson($input: RunSceneJsonInput!) {
    runSceneJson(input: $input) {
      jobId
      status
      updatedAt
      sceneJsonS3Key
      videoTitle
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
    }
  }
`;

const updateSceneJsonMutation = `
  mutation UpdateSceneJson($input: UpdateSceneJsonInput!) {
    updateSceneJson(input: $input) {
      job {
        jobId
        status
        updatedAt
        sceneJsonS3Key
        contentId
        topicId
        language
        targetDurationSec
        retryCount
        createdAt
        videoTitle
      }
      topicSeed {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      topicPlan {
        contentId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
        creativeBrief
      }
      sceneJson {
        videoTitle
        language
        scenes {
          sceneId
          durationSec
          narration
          imagePrompt
          videoPrompt
          subtitle
          bgmMood
          sfx
        }
      }
      assets {
        sceneId
        imageS3Key
        videoClipS3Key
        voiceS3Key
      }
    }
  }
`;

const runAssetGenerationMutation = `
  mutation RunAssetGeneration($input: RunAssetGenerationInput!) {
    runAssetGeneration(input: $input) {
      jobId
      status
      updatedAt
      contentId
      topicId
      language
      targetDurationSec
      retryCount
      createdAt
      videoTitle
    }
  }
`;

const gql = async <T>(query: string, variables?: Record<string, unknown>) => {
  const runtime = getGraphqlRuntime();
  const token = runtime.getToken ? await runtime.getToken() : null;
  try {
    return await gqlFetch<T>({
      url: runtime.url,
      query,
      variables,
      token,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      runtime.onUnauthorized?.();
    }
    throw error;
  }
};

export const useAdminContentsQuery = (
  vars: { limit?: number; nextToken?: string },
  options?: Omit<
    UseQueryOptions<
      Connection<AdminContent>,
      Error,
      Connection<AdminContent>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["adminContents", vars.limit ?? 50, vars.nextToken ?? ""],
    queryFn: async () => {
      const data = await gql<{ adminContents: Connection<AdminContent> }>(
        adminContentsQuery,
        vars,
      );
      return data.adminContents;
    },
    ...options,
  });
};

export const useAdminJobsQuery = (
  vars: {
    status?: AdminJob["status"];
    contentId?: string;
    limit?: number;
    nextToken?: string;
  },
  options?: Omit<
    UseQueryOptions<
      Connection<AdminJob>,
      Error,
      Connection<AdminJob>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: [
      "adminJobs",
      vars.status ?? "",
      vars.contentId ?? "",
      vars.limit ?? 20,
      vars.nextToken ?? "",
    ],
    queryFn: async () => {
      const data = await gql<{ adminJobs: Connection<AdminJob> }>(
        adminJobsQuery,
        vars,
      );
      return data.adminJobs;
    },
    ...options,
  });
};

export const usePendingReviewsQuery = (
  vars: { limit?: number; nextToken?: string },
  options?: Omit<
    UseQueryOptions<
      Connection<PendingReview>,
      Error,
      Connection<PendingReview>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["pendingReviews", vars.limit ?? 20, vars.nextToken ?? ""],
    queryFn: async () => {
      const data = await gql<{ pendingReviews: Connection<PendingReview> }>(
        pendingReviewsQuery,
        vars,
      );
      return data.pendingReviews;
    },
    ...options,
  });
};

export const useLlmSettingsQuery = (
  options?: Omit<
    UseQueryOptions<
      LlmStepSettings[],
      Error,
      LlmStepSettings[],
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["llmSettings"],
    queryFn: async () => {
      const data = await gql<{ llmSettings: { items: LlmStepSettings[] } }>(
        llmSettingsQuery,
      );
      return data.llmSettings.items;
    },
    ...options,
  });
};

export const useJobDraftQuery = (
  vars: { jobId: string },
  options?: Omit<
    UseQueryOptions<
      JobDraftDetail | null,
      Error,
      JobDraftDetail | null,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["jobDraft", vars.jobId],
    queryFn: async () => {
      const data = await gql<{ jobDraft: JobDraftDetail | null }>(
        jobDraftQuery,
        vars,
      );
      return data.jobDraft;
    },
    ...options,
  });
};

export const useSubmitReviewDecisionMutation = (
  options?: UseMutationOptions<
    { submitReviewDecision: { ok: boolean; status: string } },
    Error,
    {
      jobId: string;
      action: "APPROVE" | "REJECT" | "REGENERATE";
      regenerationScope?: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ submitReviewDecision: { ok: boolean; status: string } }>(
        submitReviewMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useRequestUploadMutation = (
  options?: UseMutationOptions<
    { requestUpload: { ok: boolean; status: string } },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ requestUpload: { ok: boolean; status: string } }>(
        requestUploadMutation,
        { input },
      );
    },
    ...options,
  });
};

export const useUpdateLlmStepSettingsMutation = (
  options?: UseMutationOptions<
    { updateLlmStepSettings: LlmStepSettings },
    Error,
    {
      stepKey: string;
      provider: LlmProvider;
      model: string;
      temperature: number;
      maxOutputTokens?: number;
      secretIdEnvVar: string;
      promptVersion: string;
      systemPrompt: string;
      userPrompt: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateLlmStepSettings: LlmStepSettings }>(
        updateLlmStepSettingsMutation,
        { input },
      );
    },
    ...options,
  });
};

export type CreateContentMutationInput = {
  label: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
};

export type UpdateContentMutationInput = {
  contentId: string;
  label?: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
  clearYoutubePublish?: boolean;
};

export const useCreateContentMutation = (
  options?: UseMutationOptions<
    { createContent: AdminContent },
    Error,
    CreateContentMutationInput
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createContent: AdminContent }>(createContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useUpdateContentMutation = (
  options?: UseMutationOptions<
    { updateContent: AdminContent },
    Error,
    UpdateContentMutationInput
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateContent: AdminContent }>(updateContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useDeleteContentMutation = (
  options?: UseMutationOptions<
    { deleteContent: { ok: boolean; contentId: string } },
    Error,
    { contentId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ deleteContent: { ok: boolean; contentId: string } }>(
        deleteContentMutation,
        input,
      );
    },
    ...options,
  });
};

const buildCreateDraftJobVariables = (input: {
  contentId?: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  runTopicPlan?: boolean;
}): { input: Record<string, unknown> } => {
  const payload: Record<string, unknown> = {
    targetLanguage: input.targetLanguage,
    titleIdea: input.titleIdea,
    targetDurationSec: input.targetDurationSec,
    stylePreset: input.stylePreset,
  };
  const cid = input.contentId;
  if (cid != null && String(cid).trim() !== "") {
    payload.contentId = String(cid).trim();
  }
  if (input.creativeBrief != null && String(input.creativeBrief).trim() !== "") {
    payload.creativeBrief = String(input.creativeBrief).trim();
  }
  if (input.autoPublish !== undefined) {
    payload.autoPublish = input.autoPublish;
  }
  if (input.publishAt != null && String(input.publishAt).trim() !== "") {
    payload.publishAt = input.publishAt;
  }
  if (input.runTopicPlan !== undefined) {
    payload.runTopicPlan = input.runTopicPlan;
  }
  return { input: payload };
};

export const useCreateDraftJobMutation = (
  options?: UseMutationOptions<
    { createDraftJob: AdminJob },
    Error,
    {
      contentId?: string;
      targetLanguage: string;
      titleIdea: string;
      targetDurationSec: number;
      stylePreset: string;
      creativeBrief?: string;
      autoPublish?: boolean;
      publishAt?: string;
      /** false면 시드만 두고 DRAFT 유지. 생략 시 백엔드에서 토픽 플랜까지 실행. */
      runTopicPlan?: boolean;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createDraftJob: AdminJob }>(
        createDraftJobMutation,
        buildCreateDraftJobVariables(input),
      );
    },
    ...options,
  });
};

export const useAttachJobToContentMutation = (
  options?: UseMutationOptions<
    { attachJobToContent: AdminJob },
    Error,
    { jobId: string; contentId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ attachJobToContent: AdminJob }>(attachJobToContentMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useDeleteJobMutation = (
  options?: UseMutationOptions<
    { deleteJob: { ok: boolean; jobId: string } },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ deleteJob: { ok: boolean; jobId: string } }>(
        deleteJobMutation,
        input,
      );
    },
    ...options,
  });
};

export const useUpdateTopicSeedMutation = (
  options?: UseMutationOptions<
    { updateTopicSeed: TopicSeed },
    Error,
    TopicSeed & { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateTopicSeed: TopicSeed }>(updateTopicSeedMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useRunTopicPlanMutation = (
  options?: UseMutationOptions<
    { runTopicPlan: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runTopicPlan: AdminJob }>(runTopicPlanMutation, { input });
    },
    ...options,
  });
};

export const useRunSceneJsonMutation = (
  options?: UseMutationOptions<
    { runSceneJson: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runSceneJson: AdminJob }>(runSceneJsonMutation, { input });
    },
    ...options,
  });
};

export const useUpdateSceneJsonMutation = (
  options?: UseMutationOptions<
    { updateSceneJson: JobDraftDetail },
    Error,
    { jobId: string; sceneJson: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ updateSceneJson: JobDraftDetail }>(updateSceneJsonMutation, {
        input,
      });
    },
    ...options,
  });
};

export const useRunAssetGenerationMutation = (
  options?: UseMutationOptions<
    { runAssetGeneration: AdminJob },
    Error,
    { jobId: string }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ runAssetGeneration: AdminJob }>(runAssetGenerationMutation, {
        input,
      });
    },
    ...options,
  });
};
