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
  channelId: string;
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
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

export type ContentBrief = {
  jobId: string;
  contentType: string;
  variant: string;
  channelId: string;
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

const adminJobsQuery = `
  query AdminJobs($status: JobStatus, $channelId: String, $limit: Int, $nextToken: String) {
    adminJobs(status: $status, channelId: $channelId, limit: $limit, nextToken: $nextToken) {
      items {
        jobId
        status
        reviewAction
        channelId
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
        status
        reviewAction
        channelId
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
        channelId
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
        channelId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
      }
      topicPlan {
        channelId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
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

const createDraftJobMutation = `
  mutation CreateDraftJob($input: CreateDraftJobInput!) {
    createDraftJob(input: $input) {
      jobId
      status
      channelId
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
      channelId
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
      channelId
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
      channelId
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
        channelId
        topicId
        language
        targetDurationSec
        retryCount
        createdAt
        videoTitle
      }
      topicSeed {
        channelId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
      }
      topicPlan {
        channelId
        targetLanguage
        titleIdea
        targetDurationSec
        stylePreset
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
      channelId
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

export const useAdminJobsQuery = (
  vars: {
    status?: AdminJob["status"];
    channelId?: string;
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
      vars.channelId ?? "",
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

export const useCreateDraftJobMutation = (
  options?: UseMutationOptions<
    { createDraftJob: AdminJob },
    Error,
    TopicSeed & {
      contentType: string;
      variant: string;
      autoPublish?: boolean;
      publishAt?: string;
    }
  >,
) => {
  return useMutation({
    mutationFn: async (input) => {
      return gql<{ createDraftJob: AdminJob }>(createDraftJobMutation, {
        input,
      });
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
