import { jobYoutubePublishMetadataSchema } from "../../../../shared/lib/contracts/job-youtube-publish";
import { generateStepStructuredData } from "../../../../shared/lib/llm";
import { softenMarkdownFencesForPrompt } from "../../../../shared/lib/llm/soften-markdown-fences-for-prompt";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs-shared";
import type { SceneJson } from "../../../../../types/render/scene-json";
import { badUserInput } from "../../../shared/errors";
import type { JobBriefDto } from "../../../shared/types";
import { loadSuggestYoutubePublishContext } from "../repo/load-suggest-youtube-publish-context";
import type { SuggestJobYoutubePublishMetadataInput } from "../normalize/parse-suggest-job-youtube-publish-metadata-args";

const SCENE_TEXT_CAP = 480;

const clipText = (value: string): string => {
  const t = value.trim();
  if (t.length <= SCENE_TEXT_CAP) {
    return t;
  }
  return `${t.slice(0, SCENE_TEXT_CAP)}…`;
};

const buildSceneOutlinePayload = (sceneJson: SceneJson) => {
  return {
    videoTitle: sceneJson.videoTitle,
    language: sceneJson.language,
    scenes: sceneJson.scenes.map((s) => ({
      sceneId: s.sceneId,
      narration: clipText(s.narration ?? ""),
      subtitle: clipText(s.subtitle ?? ""),
    })),
  };
};

const buildJobBriefPayload = (jobBrief: JobBriefDto) => {
  return {
    titleIdea: jobBrief.titleIdea,
    creativeBrief: softenMarkdownFencesForPrompt(jobBrief.creativeBrief ?? ""),
    targetLanguage: jobBrief.targetLanguage,
    targetDurationSec: jobBrief.targetDurationSec,
    youtubePublishTitle: jobBrief.youtubePublishTitle,
    youtubePublishDescription: jobBrief.youtubePublishDescription,
    youtubePublishTags: jobBrief.youtubePublishTags,
    youtubePublishCategoryId: jobBrief.youtubePublishCategoryId,
    youtubePublishDefaultLanguage: jobBrief.youtubePublishDefaultLanguage,
  };
};

const buildChannelDefaultsPayload = (channel: {
  label: string;
  youtubeDefaultTags?: string[];
  youtubeDefaultLanguage?: string;
  defaultCategoryId?: number;
  youtubeUploadFormat?: string;
  youtubeMadeForKids?: boolean;
}) => {
  return {
    label: channel.label,
    youtubeDefaultTags: channel.youtubeDefaultTags,
    youtubeDefaultLanguage: channel.youtubeDefaultLanguage,
    defaultCategoryId: channel.defaultCategoryId,
    youtubeUploadFormat: channel.youtubeUploadFormat,
    youtubeMadeForKids: channel.youtubeMadeForKids,
  };
};

const buildJobMetaHintsPayload = (job: JobMetaItem) => {
  return {
    videoTitle: job.videoTitle,
    youtubePublishTitle: job.youtubePublishTitle,
    youtubePublishDescription: job.youtubePublishDescription,
    youtubePublishTags: job.youtubePublishTags,
    youtubePublishCategoryId: job.youtubePublishCategoryId,
    youtubePublishDefaultLanguage: job.youtubePublishDefaultLanguage,
  };
};

const hasAnyYoutubeField = (o: Partial<Record<string, unknown>>): boolean => {
  if (typeof o.youtubePublishTitle === "string" && o.youtubePublishTitle) {
    return true;
  }
  if (
    typeof o.youtubePublishDescription === "string" &&
    o.youtubePublishDescription
  ) {
    return true;
  }
  if (Array.isArray(o.youtubePublishTags) && o.youtubePublishTags.length > 0) {
    return true;
  }
  if (typeof o.youtubePublishCategoryId === "number") {
    return true;
  }
  if (
    typeof o.youtubePublishDefaultLanguage === "string" &&
    o.youtubePublishDefaultLanguage
  ) {
    return true;
  }
  return false;
};

export type JobYoutubePublishMetadataSuggestionResult = {
  youtubePublishTitle?: string;
  youtubePublishDescription?: string;
  youtubePublishTags?: string[];
  youtubePublishCategoryId?: number;
  youtubePublishDefaultLanguage?: string;
};

export const suggestAdminJobYoutubePublishMetadata = async (
  input: SuggestJobYoutubePublishMetadataInput,
): Promise<JobYoutubePublishMetadataSuggestionResult> => {
  const ctx = await loadSuggestYoutubePublishContext({
    jobId: input.jobId,
    outputLocaleHint: input.outputLocaleHint,
  });

  const localeLine =
    ctx.outputLocaleHint?.trim() ||
    ctx.jobBrief.targetLanguage ||
    ctx.sceneJson.language ||
    "";

  const result = await generateStepStructuredData({
    jobId: input.jobId,
    stepKey: "youtube-publish-metadata",
    variables: {
      outputLocaleHint: localeLine,
      jobBriefJson: JSON.stringify(buildJobBriefPayload(ctx.jobBrief)),
      sceneOutlineJson: JSON.stringify(buildSceneOutlinePayload(ctx.sceneJson)),
      channelDefaultsJson: JSON.stringify(
        buildChannelDefaultsPayload(ctx.channel),
      ),
      jobMetaHintsJson: JSON.stringify(buildJobMetaHintsPayload(ctx.job)),
    },
    validate: (payload: unknown) => {
      const parsed = jobYoutubePublishMetadataSchema.safeParse(payload);
      if (!parsed.success) {
        throw badUserInput(
          `LLM output failed validation: ${parsed.error.flatten().formErrors.join("; ")}`,
        );
      }
      return parsed.data;
    },
    buildMockResult: () => ({}),
  });

  if (result.metadata.mocked) {
    throw badUserInput(
      "LLM is not configured for this environment (youtube-publish-metadata step). Set provider credentials in LLM settings.",
    );
  }

  if (!hasAnyYoutubeField(result.output)) {
    throw badUserInput("LLM returned no usable YouTube metadata fields");
  }

  return result.output;
};
