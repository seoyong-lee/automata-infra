import { notFound } from "../../../../admin/shared/errors";
import { getStandaloneVideoTranscript } from "../../../../shared/lib/store/standalone-video-transcripts";

export const getTranscript = async (input: { transcriptId: string }) => {
  const transcript = await getStandaloneVideoTranscript(input.transcriptId);
  if (!transcript) {
    throw notFound("transcript not found");
  }
  return transcript;
};
