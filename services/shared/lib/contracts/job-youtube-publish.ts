import { z } from "zod";

/**
 * 잡 단위 YouTube 업로드 오버라이드 (채널 기본값보다 우선).
 *
 * LLM 자동 생성 권장 입력: `sceneJson`(videoTitle, scenes[].narration/subtitle),
 * `titleIdea`, `creativeBrief`, `targetLanguage`. 출력은 이 스키마와 동일 키로
 * 파싱한 뒤 `updateJobBrief`에 넣거나, 내부 워커에서 `saveJobBrief`로 반영하면 된다.
 * 검색용 키워드는 별도 태그 배열이 아니라 `youtubePublishDescription` 끝의 `#해시태그` 한 줄에 둔다.
 */
export const jobYoutubePublishMetadataSchema = z
  .object({
    youtubePublishTitle: z.string().trim().min(1).max(500).optional(),
    youtubePublishDescription: z.string().max(5000).optional(),
    youtubePublishCategoryId: z.number().int().positive().max(999).optional(),
    youtubePublishDefaultLanguage: z
      .string()
      .trim()
      .min(2)
      .regex(/^[a-z]{2}(-[A-Za-z0-9]+)?$/)
      .optional(),
  })
  .strict();

export type JobYoutubePublishMetadata = z.infer<
  typeof jobYoutubePublishMetadataSchema
>;
