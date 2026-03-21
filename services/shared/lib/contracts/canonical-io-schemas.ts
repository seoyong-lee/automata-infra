import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const nonEmpty = z.string().trim().min(1);
const publishAtSchema = z.string().trim().min(1);
const jobVariantSchema = z.string().trim().min(1);

/** 미연결 잡 전용 placeholder contentId. 실제 카탈로그에는 등록하지 않는다. */
export const ADMIN_UNASSIGNED_CONTENT_ID = "__unassigned__";

const optionalCreativeBrief = z
  .string()
  .max(8000)
  .optional()
  .transform((s) => {
    if (s === undefined) {
      return undefined;
    }
    const t = s.trim();
    return t.length === 0 ? undefined : t;
  });

export const topicSeedInputSchema = z
  .object({
    contentId: nonEmpty,
    targetLanguage: nonEmpty,
    titleIdea: nonEmpty,
    targetDurationSec: z.number().int().positive(),
    stylePreset: nonEmpty,
    /** 씬·내레이션 방향을 자유 서술로 적는 필드. Scene JSON 프롬프트에 포함된다. */
    creativeBrief: optionalCreativeBrief,
  })
  .strict();

const optionalCatalogContentId = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") {
    return undefined;
  }
  if (typeof v !== "string") {
    return v;
  }
  const t = v.trim();
  return t === "" ? undefined : t;
}, nonEmpty.optional());

/**
 * contentId 생략 시 미연결 잡(placeholder `ADMIN_UNASSIGNED_CONTENT_ID`)으로 생성.
 * `runTopicPlan` 생략 또는 true: 잡 생성 직후 토픽 플랜까지 한 번에 실행(기본 동작).
 */
export const createDraftJobInputSchema = z
  .object({
    contentId: optionalCatalogContentId,
    targetLanguage: nonEmpty,
    titleIdea: nonEmpty,
    targetDurationSec: z.number().int().positive(),
    stylePreset: nonEmpty,
    creativeBrief: optionalCreativeBrief,
    autoPublish: z.boolean().optional(),
    publishAt: publishAtSchema.optional(),
    /** false일 때만 시드만 두고 DRAFT로 둔다. */
    runTopicPlan: z.boolean().optional(),
  })
  .strict();

export const attachJobToContentInputSchema = z
  .object({
    jobId: nonEmpty,
    contentId: nonEmpty,
  })
  .strict();

export type AttachJobToContentInput = z.infer<
  typeof attachJobToContentInputSchema
>;

/** 콘텐츠 = 채널 단일 단위 (유튜브 게시 설정은 동일 레코드에 저장). 식별자는 contentId만 사용. */
export const createContentInputSchema = z
  .object({
    label: nonEmpty,
    youtubeSecretName: z.string().trim().min(1).optional(),
    youtubeAccountType: z.string().trim().min(1).optional(),
    autoPublishEnabled: z.boolean().optional(),
    defaultVisibility: z.enum(["private", "unlisted", "public"]).optional(),
    defaultCategoryId: z.number().int().positive().optional(),
    playlistId: z.string().trim().min(1).optional(),
  })
  .strict();

export const updateContentInputSchema = z
  .object({
    contentId: nonEmpty,
    label: nonEmpty.optional(),
    youtubeSecretName: z.string().optional(),
    youtubeAccountType: z.string().optional(),
    autoPublishEnabled: z.boolean().optional(),
    defaultVisibility: z.enum(["private", "unlisted", "public"]).optional(),
    defaultCategoryId: z.number().int().positive().optional(),
    playlistId: z.string().optional(),
    clearYoutubePublish: z.boolean().optional(),
  })
  .strict();

export const runTopicPlanInputSchema = z
  .object({
    jobId: nonEmpty,
  })
  .strict();

export const contentBriefSchema = z
  .object({
    jobId: nonEmpty,
    contentType: nonEmpty,
    variant: jobVariantSchema,
    contentId: nonEmpty,
    language: nonEmpty,
    targetPlatform: nonEmpty,
    targetDurationSec: z.number().int().positive(),
    titleIdea: nonEmpty,
    stylePreset: nonEmpty,
    autoPublish: z.boolean().optional(),
    publishAt: z.string().optional(),
    seed: z
      .object({
        date: isoDateSchema,
        fortuneType: nonEmpty,
        audience: nonEmpty,
        style: nonEmpty,
        tone: nonEmpty,
        topicKey: nonEmpty,
      })
      .strict(),
    constraints: z
      .object({
        maxScenes: z.number().int().positive(),
        mustHaveHook: z.boolean(),
        mustHaveCTA: z.boolean(),
        safetyLevel: z.enum(["default", "strict", "relaxed"]),
        noMedicalOrLegalClaims: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const sourcePackSchema = z
  .object({
    date: isoDateSchema,
    calendar: z
      .object({
        solarDate: isoDateSchema,
        lunarDate: nonEmpty,
        weekday: nonEmpty,
      })
      .strict(),
    fortuneFramework: z
      .object({
        segments: z.array(nonEmpty).min(1),
        scoringScale: z.array(z.number().int()).min(1),
      })
      .strict(),
    editorialRules: z
      .object({
        avoidFearmongering: z.boolean(),
        avoidAbsolutePredictions: z.boolean(),
        keepEntertainmentTone: z.boolean(),
        maxSubtitleLen: z.number().int().positive(),
      })
      .strict(),
    visualRules: z
      .object({
        theme: nonEmpty,
        avoidModernCity: z.boolean(),
        preferredElements: z.array(nonEmpty).min(1),
      })
      .strict(),
  })
  .strict();

export const scriptSectionSchema = z
  .object({
    key: nonEmpty,
    label: nonEmpty,
    score: z.number().int(),
    text: nonEmpty,
  })
  .strict();

export const scriptStructureSchema = z
  .object({
    titleCandidates: z.array(nonEmpty).min(1),
    hook: nonEmpty,
    summary: nonEmpty,
    sections: z.array(scriptSectionSchema).min(1),
    cta: nonEmpty,
  })
  .strict();

export type ContentBrief = z.infer<typeof contentBriefSchema>;
export type SourcePack = z.infer<typeof sourcePackSchema>;
export type ScriptSection = z.infer<typeof scriptSectionSchema>;
export type ScriptStructure = z.infer<typeof scriptStructureSchema>;
export type TopicSeedInput = z.infer<typeof topicSeedInputSchema>;
export type CreateDraftJobInput = z.infer<typeof createDraftJobInputSchema>;
export type CreateContentInput = z.infer<typeof createContentInputSchema>;
export type UpdateContentInput = z.infer<typeof updateContentInputSchema>;
export type RunTopicPlanInput = z.infer<typeof runTopicPlanInputSchema>;

export const parseContentBrief = (payload: unknown): ContentBrief => {
  return contentBriefSchema.parse(payload);
};

export const parseSourcePack = (payload: unknown): SourcePack => {
  return sourcePackSchema.parse(payload);
};

export const parseScriptStructure = (payload: unknown): ScriptStructure => {
  return scriptStructureSchema.parse(payload);
};

export const parseTopicSeedInput = (payload: unknown): TopicSeedInput => {
  return topicSeedInputSchema.parse(payload);
};

export const parseCreateDraftJobInput = (
  payload: unknown,
): CreateDraftJobInput => {
  return createDraftJobInputSchema.parse(payload);
};

export const parseAttachJobToContentInput = (
  payload: unknown,
): AttachJobToContentInput => {
  return attachJobToContentInputSchema.parse(payload);
};

export const parseCreateContentInput = (
  payload: unknown,
): CreateContentInput => {
  return createContentInputSchema.parse(payload);
};

export const parseUpdateContentInput = (
  payload: unknown,
): UpdateContentInput => {
  return updateContentInputSchema.parse(payload);
};

export const parseRunTopicPlanInput = (payload: unknown): RunTopicPlanInput => {
  return runTopicPlanInputSchema.parse(payload);
};
