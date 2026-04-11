import {
  jobYoutubePublishMetadataSchema,
  type JobYoutubePublishMetadata,
} from "../../../../shared/lib/contracts/job-youtube-publish";
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
    youtubePublishCategoryId: job.youtubePublishCategoryId,
    youtubePublishDefaultLanguage: job.youtubePublishDefaultLanguage,
  };
};

const isHashtagToken = (token: string): boolean =>
  token.startsWith("#") && token.length > 1 && !token.slice(1).includes("#");

const isHashtagOnlyLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) {
    return false;
  }
  const parts = t.split(/\s+/);
  return parts.length > 0 && parts.every(isHashtagToken);
};

const splitTrailingHashtagSuffixFromSingleLine = (
  line: string,
): { body: string; hashtagLine: string | null } => {
  const trimmed = line.trim();
  const m = trimmed.match(/^(.+?)(\s+#\S+(?:\s+#\S+)*)$/u);
  if (!m?.[1] || !m[2]) {
    return { body: trimmed, hashtagLine: null };
  }
  const body = m[1].trimEnd();
  const suffix = m[2].trim();
  const tokens = suffix.split(/\s+/);
  if (body.length === 0 || !tokens.every(isHashtagToken)) {
    return { body: trimmed, hashtagLine: null };
  }
  return { body, hashtagLine: suffix };
};

/** Teaser body only (no trailing hashtag block). */
const clampTeaserBodyText = (rawBody: string): string => {
  const text = rawBody.trim();
  if (!text) {
    return text;
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length >= 2) {
    return lines.slice(0, 4).join("\n");
  }

  const single = lines[0] ?? text;
  const sentences = single
    .split(/(?<=[.!?。！？…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length > 4) {
    return sentences.slice(0, 4).join(" ").trim();
  }

  const maxChars = 400;
  if (single.length > maxChars) {
    const cut = single.slice(0, maxChars - 1).trimEnd();
    const lastSpace = cut.lastIndexOf(" ");
    const base = lastSpace > 180 ? cut.slice(0, lastSpace) : cut;
    return `${base}…`;
  }

  return single;
};

/** Keep teaser lines short while preserving a final hashtag-only block (Korean YouTube style). */
const clampYoutubePublishDescriptionSummary = (raw: string): string => {
  const text = raw.trim();
  if (!text) {
    return text;
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let cut = lines.length;
  while (cut > 0 && isHashtagOnlyLine(lines[cut - 1]!)) {
    cut -= 1;
  }
  let suffixLines = lines.slice(cut);
  let prefixLines = lines.slice(0, cut);

  if (prefixLines.length === 0) {
    return suffixLines.join("\n");
  }

  if (prefixLines.length === 1) {
    const split = splitTrailingHashtagSuffixFromSingleLine(prefixLines[0]!);
    if (split.hashtagLine) {
      prefixLines = split.body ? [split.body] : [];
      suffixLines = [...suffixLines, split.hashtagLine];
    }
  }

  if (prefixLines.length === 0) {
    return suffixLines.join("\n");
  }

  const clampedTeaser =
    prefixLines.length >= 2
      ? prefixLines.slice(0, 4).join("\n")
      : clampTeaserBodyText(prefixLines[0]!);

  if (suffixLines.length === 0) {
    return clampedTeaser;
  }
  return `${clampedTeaser}\n\n${suffixLines.join("\n")}`;
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
  /** 하위 호환: LLM은 더 이상 태그 배열을 내지 않으며 항상 빈 배열로 반환한다. */
  youtubePublishTags: string[];
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

  const result = await generateStepStructuredData<JobYoutubePublishMetadata>({
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

  const out = result.output;
  const desc = out.youtubePublishDescription;
  if (typeof desc === "string" && desc.trim().length > 0) {
    return {
      ...out,
      youtubePublishDescription: clampYoutubePublishDescriptionSummary(desc),
      youtubePublishTags: [],
    };
  }

  return { ...out, youtubePublishTags: [] };
};
