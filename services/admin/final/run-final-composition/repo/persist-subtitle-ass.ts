import { putBufferToS3 } from "../../../../shared/lib/aws/runtime";
import {
  buildSubtitleAss,
  hasSubtitleAssEntries,
} from "../mapper/build-subtitle-ass";
import type { RenderPlan } from "../../../../../types/render/render-plan";

const SUBTITLE_ASS_CONTENT_TYPE = "text/x-ass";

export const persistSubtitleAss = async (input: {
  jobId: string;
  renderPlan: RenderPlan;
  burnInSubtitles: boolean;
}): Promise<string | undefined> => {
  if (!input.burnInSubtitles || !hasSubtitleAssEntries(input.renderPlan)) {
    return undefined;
  }
  const ass = buildSubtitleAss(input.renderPlan);
  if (!ass.trim()) {
    return undefined;
  }
  const key = `rendered/${input.jobId}/subtitles/latest.ass`;
  await putBufferToS3(key, ass, SUBTITLE_ASS_CONTENT_TYPE);
  return key;
};
