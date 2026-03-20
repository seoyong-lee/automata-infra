import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { google } from "googleapis";
import { z } from "zod";
import {
  getAssetsBucketName,
  getSecretJson,
} from "../../../shared/lib/aws/runtime";
import { getResolvedChannelPublishConfig } from "../../../shared/lib/store/channel-publish-config";
import {
  type JobMetaItem,
  getJobMeta,
} from "../../../shared/lib/store/video-jobs";
import { mapUploadResult } from "../mapper/map-upload-result";
import { persistUploadedRecord } from "../repo/persist-uploaded-record";

const region = process.env.AWS_REGION ?? "ap-northeast-2";
const s3Client = new S3Client({ region });

const youtubeOAuthSecretSchema = z
  .object({
    client_id: z.string().trim().min(1),
    client_secret: z.string().trim().min(1),
    refresh_token: z.string().trim().min(1),
    youtube_channel_id: z.string().trim().min(1).optional(),
  })
  .strict();

const buildVideoDescription = (input: {
  channelId: string;
  contentType?: string;
  jobId: string;
}): string => {
  const lines = [
    `Channel: ${input.channelId}`,
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

const getYoutubeSecret = async (secretName: string) => {
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

const createYoutubeClient = (
  secret: z.infer<typeof youtubeOAuthSecretSchema>,
) => {
  const auth = new google.auth.OAuth2(secret.client_id, secret.client_secret);
  auth.setCredentials({
    refresh_token: secret.refresh_token,
  });
  return google.youtube({
    version: "v3",
    auth,
  });
};

const uploadVideo = async (input: {
  job: JobMetaItem;
  jobId: string;
  secret: z.infer<typeof youtubeOAuthSecretSchema>;
  videoBody: NodeJS.ReadableStream;
  defaultVisibility: string;
  defaultCategoryId?: number;
}) => {
  const youtube = createYoutubeClient(input.secret);
  const publishAt = input.job.publishAt;
  const effectiveVisibility = publishAt ? "private" : input.defaultVisibility;
  const inserted = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: input.job.videoTitle,
        description: buildVideoDescription({
          channelId: input.job.channelId,
          contentType: input.job.contentType,
          jobId: input.jobId,
        }),
        categoryId: String(input.defaultCategoryId ?? 22),
      },
      status: {
        privacyStatus: effectiveVisibility,
        publishAt,
      },
    },
    media: {
      body: input.videoBody,
    },
  });
  const youtubeVideoId = inserted.data.id;
  if (!youtubeVideoId) {
    throw new Error("youtube upload returned no video id");
  }
  return {
    youtube,
    youtubeVideoId,
    publishAt,
    effectiveVisibility,
  };
};

const maybeAddToPlaylist = async (input: {
  youtube: ReturnType<typeof google.youtube>;
  playlistId?: string;
  youtubeVideoId: string;
}) => {
  if (!input.playlistId) {
    return;
  }
  await input.youtube.playlistItems.insert({
    part: ["snippet"],
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

export const completeUpload = async (jobId: string) => {
  const job = await getUploadJob(jobId);
  const channelConfig = await getResolvedChannelPublishConfig(job.channelId);
  const secretName = channelConfig?.youtubeSecretName;
  if (!secretName) {
    throw new Error(
      `youtube secret not configured for channel ${job.channelId}`,
    );
  }

  const secret = await getYoutubeSecret(secretName);
  const videoBody = await getVideoBody(job.finalVideoS3Key);
  const uploaded = await uploadVideo({
    job,
    jobId,
    secret,
    videoBody,
    defaultVisibility: channelConfig?.defaultVisibility ?? "private",
    defaultCategoryId: channelConfig?.defaultCategoryId,
  });
  await maybeAddToPlaylist({
    youtube: uploaded.youtube,
    playlistId: channelConfig?.playlistId,
    youtubeVideoId: uploaded.youtubeVideoId,
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
