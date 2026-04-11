import type { SceneVisualNeed } from "../contracts/canonical-io-schemas";
import type { SceneVideoTranscript } from "../contracts/video-transcript";

export type QueryPage<T> = {
  items: T[];
  nextToken: string | null;
};

export type JobMetaItem = {
  PK: string;
  SK: "META";
  jobId: string;
  contentId?: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetFormat?: string;
  presetDuration?: string;
  presetPlatformPreset?: string;
  status: string;
  autoPublish?: boolean;
  publishAt?: string;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  /** YouTube `videos.insert` 제목 오버라이드; 없으면 `videoTitle` 사용 */
  youtubePublishTitle?: string;
  /** 업로드 설명; 없으면 시스템 기본(콘텐츠·잡 ID) 설명 */
  youtubePublishDescription?: string;
  /** @deprecated 레거시. 업로드 메타 태그는 설명 끝 해시태그로만 쓰며 API에서 더 이상 설정하지 않는다. */
  youtubePublishTags?: string[];
  /** 카테고리 ID; 없으면 채널 기본 */
  youtubePublishCategoryId?: number;
  /** `snippet.defaultLanguage`; 없으면 채널 기본 */
  youtubePublishDefaultLanguage?: string;
  estimatedCost: number;
  providerCosts: Record<string, number>;
  reviewMode: boolean;
  retryCount: number;
  lastError: string | null;
  jobBriefS3Key?: string;
  jobPlanS3Key?: string;
  sceneJsonS3Key?: string;
  assetManifestS3Key?: string;
  renderPlanS3Key?: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  reviewTaskToken?: string;
  reviewRequestedAt?: string;
  reviewAction?: string;
  reviewPreviewS3Key?: string;
  uploadStatus?: string;
  uploadVideoId?: string;
  contentBriefS3Key?: string;
  approvedPlanExecutionId?: string;
  approvedSceneExecutionId?: string;
  approvedAssetExecutionId?: string;
  defaultVoiceProfileId?: string;
  backgroundMusicS3Key?: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI4PK?: string;
  GSI4SK?: string;
  GSI5PK?: string;
  GSI5SK?: string;
};

export type ContentItem = {
  PK: string;
  SK: "META";
  contentId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  GSI6PK: string;
  GSI6SK: string;
  youtubeSecretName?: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
  youtubeUpdatedAt?: string;
  youtubeUpdatedBy?: string;
  /** YouTube Data API v3 연동 — `services/shared/lib/contracts/youtube-channel-publish` 와 동일 의미 */
  youtubeExternalChannelId?: string;
  youtubeChannelTitle?: string;
  youtubeChannelDescription?: string;
  youtubeChannelCustomUrl?: string;
  youtubeChannelKeywords?: string;
  youtubeChannelSyncedAt?: string;
  youtubeDefaultTags?: string[];
  youtubeDefaultLanguage?: string;
  youtubeNotifySubscribers?: boolean;
  youtubeMadeForKids?: boolean;
  youtubeUploadFormat?: "standard" | "shorts";
};

export const CONTENT_CATALOG_GSI_PK = "CONTENT_CATALOG";

export const gsi2PkForContentId = (contentId: string): string => {
  if (contentId.startsWith("cnt_")) {
    return `CONTENT#${contentId}`;
  }
  return `CHANNEL#${contentId}`;
};

type JobMetaRow = JobMetaItem & { channelId?: string };

export const normalizeJobMeta = (raw: JobMetaRow): JobMetaItem => {
  const { channelId: legacy, ...rest } = raw;
  const contentId = rest.contentId ?? legacy;
  return { ...rest, contentId };
};

export const mapJobMetaPage = (
  page: QueryPage<JobMetaItem>,
): QueryPage<JobMetaItem> => ({
  items: page.items.map((x) => normalizeJobMeta(x as JobMetaRow)),
  nextToken: page.nextToken,
});

export type SceneAssetItem = {
  PK: string;
  SK: string;
  sceneId: number;
  visualType?: string;
  durationSec?: number;
  narration?: string;
  subtitle?: string;
  storyBeat?: string;
  visualNeed?: SceneVisualNeed;
  voiceDurationSec?: number;
  imagePrompt?: string;
  videoPrompt?: string;
  stockImageSearchStatus?: string;
  stockImageSearchQuery?: string;
  stockVideoSearchStatus?: string;
  stockVideoSearchQuery?: string;
  imageS3Key?: string;
  videoClipS3Key?: string;
  voiceS3Key?: string;
  videoTranscript?: SceneVideoTranscript;
  imageSelectedCandidateId?: string;
  videoSelectedCandidateId?: string;
  /** AI/선택 시각(ISO). 이미지 `imageSelectedAt`과 대응. */
  videoSelectedAt?: string;
  voiceSelectedCandidateId?: string;
  voiceProfileId?: string;
  validationStatus?: string;
  [key: string]: unknown;
};

export type SceneImageCandidateItem = {
  PK: string;
  SK: string;
  sceneId: number;
  candidateId: string;
  imageS3Key?: string;
  candidateSource?: string;
  assetPoolAssetId?: string;
  matchScore?: number;
  provider?: string;
  providerLogS3Key?: string;
  promptHash?: string;
  mocked?: boolean;
  sourceUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
  sourceAssetId?: string;
  licenseType?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  width?: number;
  height?: number;
  createdAt: string;
};

export type SceneVideoCandidateItem = {
  PK: string;
  SK: string;
  sceneId: number;
  candidateId: string;
  videoClipS3Key?: string;
  candidateSource?: string;
  assetPoolAssetId?: string;
  matchScore?: number;
  provider?: string;
  providerLogS3Key?: string;
  promptHash?: string;
  mocked?: boolean;
  sourceUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
  sourceAssetId?: string;
  licenseType?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  width?: number;
  height?: number;
  durationSec?: number;
  createdAt: string;
};

export type SceneVoiceCandidateItem = {
  PK: string;
  SK: string;
  sceneId: number;
  candidateId: string;
  voiceS3Key: string;
  provider?: string;
  providerLogS3Key?: string;
  mocked?: boolean;
  voiceDurationSec?: number;
  voiceProfileId?: string;
  createdAt: string;
};

export type RenderArtifactItem = {
  PK: string;
  SK: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  renderPlanS3Key?: string;
  subtitleAssS3Key?: string;
  provider?: string;
  providerRenderId?: string | null;
  createdAt: string;
};

export const encodeNextToken = (
  key?: Record<string, unknown>,
): string | null => {
  if (!key) {
    return null;
  }
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
};

export const decodeNextToken = (
  token?: string,
): Record<string, unknown> | undefined => {
  if (!token) {
    return undefined;
  }
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

export const jobPk = (jobId: string): string => `JOB#${jobId}`;

export const contentPk = (contentId: string): string => `CONTENT#${contentId}`;

export const ALL_JOB_STATUSES_FOR_ADMIN: readonly string[] = [
  "DRAFT",
  "PLANNING",
  "PLANNED",
  "SCENE_JSON_BUILDING",
  "SCENE_JSON_READY",
  "ASSET_GENERATING",
  "ASSETS_READY",
  "VALIDATING",
  "RENDER_PLAN_READY",
  "RENDERED",
  "REVIEW_PENDING",
  "APPROVED",
  "REJECTED",
  "UPLOAD_QUEUED",
  "UPLOADED",
  "FAILED",
  "METRICS_COLLECTED",
];
