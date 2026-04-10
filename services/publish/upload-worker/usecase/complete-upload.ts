import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { youtube_v3 } from "googleapis";
import {
  getAssetsBucketName,
  getSecretJson,
} from "../../../shared/lib/aws/runtime";
import {
  createYoutubeDataClient,
  type YoutubeOAuthSecret,
  youtubeOAuthSecretSchema,
} from "../../../shared/lib/providers/youtube/youtube-oauth";
import { loadYoutubeDataApiKey } from "../../../shared/lib/providers/youtube/load-youtube-data-api-key";
import { getResolvedChannelPublishConfig } from "../../../shared/lib/store/channel-publish-config";
import {
  type JobMetaItem,
  getJobMeta,
} from "../../../shared/lib/store/video-jobs";
import { mapUploadResult } from "../mapper/map-upload-result";
import { persistUploadedRecord } from "../repo/persist-uploaded-record";

const region = process.env.AWS_REGION ?? "ap-northeast-2";
const s3Client = new S3Client({ region });

const buildVideoDescription = (input: {
  contentId: string;
  contentType?: string;
  jobId: string;
}): string => {
  const lines = [
    `Content: ${input.contentId}`,
    input.contentType ? `Content: ${input.contentType}` : null,
    `Job: ${input.jobId}`,
  ].filter((value): value is string => Boolean(value));
  return lines.join("\n");
};

const getUploadJob = async (
  jobId: string,
): Promise<JobMetaItem & { finalVideoS3Key: string }> => {
  const job = await getJobMeta(jobId);
  if (!job) {
    throw new Error("job not found");
  }
  if (!job.finalVideoS3Key) {
    throw new Error("final video artifact not found");
  }
  return job as JobMetaItem & { finalVideoS3Key: string };
};

const getYoutubeSecret = async (
  secretName: string,
): Promise<YoutubeOAuthSecret> => {
  const secretPayload = await getSecretJson<unknown>(secretName);
  return youtubeOAuthSecretSchema.parse(secretPayload);
};

const getVideoBody = async (s3Key: string): Promise<NodeJS.ReadableStream> => {
  const asset = await s3Client.send(
    new GetObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: s3Key,
    }),
  );
  if (!asset.Body) {
    throw new Error("final video body missing");
  }
  return asset.Body as NodeJS.ReadableStream;
};

const buildSnippetTags = (input: {
  defaultTags?: string[];
  uploadFormat?: "standard" | "shorts";
}): string[] | undefined => {
  const tags = [...(input.defaultTags ?? [])];
  if (
    input.uploadFormat === "shorts" &&
    !tags.some((t) => t.toLowerCase() === "shorts")
  ) {
    tags.push("Shorts");
  }
  const unique = [...new Set(tags)];
  return unique.length ? unique : undefined;
};

const resolveYoutubeVideoTitle = (job: JobMetaItem): string => {
  const custom = job.youtubePublishTitle?.trim();
  return custom && custom.length > 0 ? custom : job.videoTitle;
};

const resolveYoutubeVideoDescription = (
  job: JobMetaItem,
  jobId: string,
): string => {
  const custom = job.youtubePublishDescription?.trim();
  if (custom && custom.length > 0) {
    return custom;
  }
  return buildVideoDescription({
    contentId: job.contentId ?? "unknown",
    contentType: job.contentType,
    jobId,
  });
};

const buildVideoInsertSnippet = (input: {
  job: JobMetaItem;
  jobId: string;
  defaultCategoryId?: number;
  defaultTags?: string[];
  defaultLanguage?: string;
  uploadFormat?: "standard" | "shorts";
}): youtube_v3.Schema$VideoSnippet => {
  const snippetTags = buildSnippetTags({
    defaultTags: input.defaultTags,
    uploadFormat: input.uploadFormat,
  });
  return {
    title: resolveYoutubeVideoTitle(input.job),
    description: resolveYoutubeVideoDescription(input.job, input.jobId),
    categoryId: String(input.defaultCategoryId ?? 22),
    ...(snippetTags ? { tags: snippetTags } : {}),
    ...(input.defaultLanguage
      ? { defaultLanguage: input.defaultLanguage }
      : {}),
  };
};

const buildVideoInsertStatus = (input: {
  job: JobMetaItem;
  defaultVisibility: string;
  madeForKids?: boolean;
}): youtube_v3.Schema$VideoStatus => {
  const publishAt = input.job.publishAt;
  const effectiveVisibility = publishAt ? "private" : input.defaultVisibility;
  const status: youtube_v3.Schema$VideoStatus = {
    privacyStatus: effectiveVisibility,
    publishAt: publishAt ?? undefined,
  };
  if (input.madeForKids !== undefined) {
    status.selfDeclaredMadeForKids = input.madeForKids;
  }
  return status;
};

const uploadVideo = async (input: {
  job: JobMetaItem;
  jobId: string;
  secret: YoutubeOAuthSecret;
  videoBody: NodeJS.ReadableStream;
  defaultVisibility: string;
  defaultCategoryId?: number;
  defaultTags?: string[];
  defaultLanguage?: string;
  uploadFormat?: "standard" | "shorts";
  notifySubscribers?: boolean;
  madeForKids?: boolean;
  dataApiKey?: string;
}) => {
  const youtube = createYoutubeDataClient(input.secret);
  const notifySubscribers =
    input.notifySubscribers ??
    (input.uploadFormat === "shorts" ? false : undefined);
  const keyOpt =
    input.dataApiKey && input.dataApiKey.trim()
      ? { key: input.dataApiKey.trim() }
      : {};

  const inserted = await youtube.videos.insert({
    part: ["snippet", "status"],
    ...(notifySubscribers === undefined ? {} : { notifySubscribers }),
    ...keyOpt,
    requestBody: {
      snippet: buildVideoInsertSnippet({
        job: input.job,
        jobId: input.jobId,
        defaultCategoryId: input.defaultCategoryId,
        defaultTags: input.defaultTags,
        defaultLanguage: input.defaultLanguage,
        uploadFormat: input.uploadFormat,
      }),
      status: buildVideoInsertStatus({
        job: input.job,
        defaultVisibility: input.defaultVisibility,
        madeForKids: input.madeForKids,
      }),
    },
    media: {
      body: input.videoBody,
    },
  });
  const youtubeVideoId = inserted.data.id;
  if (!youtubeVideoId) {
    throw new Error("youtube upload returned no video id");
  }
  const publishAt = input.job.publishAt;
  const effectiveVisibility = publishAt ? "private" : input.defaultVisibility;
  return {
    youtube,
    youtubeVideoId,
    publishAt,
    effectiveVisibility,
  };
};

const maybeAddToPlaylist = async (input: {
  youtube: ReturnType<typeof createYoutubeDataClient>;
  playlistId?: string;
  youtubeVideoId: string;
  dataApiKey?: string;
}) => {
  if (!input.playlistId) {
    return;
  }
  const keyOpt =
    input.dataApiKey && input.dataApiKey.trim()
      ? { key: input.dataApiKey.trim() }
      : {};
  await input.youtube.playlistItems.insert({
    part: ["snippet"],
    ...keyOpt,
    requestBody: {
      snippet: {
        playlistId: input.playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId: input.youtubeVideoId,
        },
      },
    },
  });
};

const uploadFinalVideoToYoutube = async (input: {
  job: JobMetaItem & { finalVideoS3Key: string };
  jobId: string;
  channelConfig: NonNullable<
    Awaited<ReturnType<typeof getResolvedChannelPublishConfig>>
  >;
  dataApiKey?: string;
}) => {
  const secretName = input.channelConfig.youtubeSecretName;
  if (!secretName) {
    throw new Error(
      `youtube secret not configured for content ${input.job.contentId}`,
    );
  }
  const secret = await getYoutubeSecret(secretName);
  const videoBody = await getVideoBody(input.job.finalVideoS3Key);
  const mergedTags = [
    ...(input.channelConfig.youtubeDefaultTags ?? []),
    ...(input.job.youtubePublishTags ?? []),
  ];
  const uploaded = await uploadVideo({
    job: input.job,
    jobId: input.jobId,
    secret,
    videoBody,
    defaultVisibility: input.channelConfig.defaultVisibility ?? "private",
    defaultCategoryId:
      input.job.youtubePublishCategoryId ??
      input.channelConfig.defaultCategoryId,
    defaultTags: mergedTags,
    defaultLanguage:
      input.job.youtubePublishDefaultLanguage ??
      input.channelConfig.youtubeDefaultLanguage,
    uploadFormat: input.channelConfig.youtubeUploadFormat,
    notifySubscribers: input.channelConfig.youtubeNotifySubscribers,
    madeForKids: input.channelConfig.youtubeMadeForKids,
    dataApiKey: input.dataApiKey,
  });
  await maybeAddToPlaylist({
    youtube: uploaded.youtube,
    playlistId: input.channelConfig.playlistId,
    youtubeVideoId: uploaded.youtubeVideoId,
    dataApiKey: input.dataApiKey,
  });
  return uploaded;
};

export const completeUpload = async (jobId: string) => {
  const job = await getUploadJob(jobId);
  const contentId = job.contentId;
  if (!contentId) {
    throw new Error("job has no contentId; cannot resolve publish config");
  }
  const channelConfig = await getResolvedChannelPublishConfig(contentId);
  if (!channelConfig) {
    throw new Error(`publish config not found for content ${contentId}`);
  }

  const dataApiKey = await loadYoutubeDataApiKey();
  const uploaded = await uploadFinalVideoToYoutube({
    job,
    jobId,
    channelConfig,
    dataApiKey,
  });

  const uploadedAt = new Date().toISOString();
  await persistUploadedRecord({
    jobId,
    uploadedAt,
    youtubeVideoId: uploaded.youtubeVideoId,
    visibility: uploaded.effectiveVisibility,
    publishAt: uploaded.publishAt,
  });

  return mapUploadResult({
    jobId,
    uploadedAt,
    youtubeVideoId: uploaded.youtubeVideoId,
    visibility: uploaded.effectiveVisibility,
    publishAt: uploaded.publishAt,
  });
};
