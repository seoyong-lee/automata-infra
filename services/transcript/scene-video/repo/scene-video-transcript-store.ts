import { putBufferToS3, putJsonToS3 } from "../../../shared/lib/aws/runtime-s3";
import type {
  NormalizedSceneVideoTranscript,
  SceneVideoTranscript,
} from "../../../shared/lib/contracts/video-transcript";
import { upsertSceneAsset } from "../../../shared/lib/store/video-jobs";

const sanitizeKeyPart = (value: string): string => {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
};

export const buildSceneVideoTranscriptArtifactKeys = (input: {
  jobId: string;
  sceneId: number;
  providerJobId: string;
}) => {
  const base = `assets/${input.jobId}/transcript/scene-${input.sceneId}/${sanitizeKeyPart(input.providerJobId)}`;
  return {
    jsonKey: `${base}.json`,
    vttKey: `${base}.vtt`,
    srtKey: `${base}.srt`,
  };
};

export const saveSceneVideoTranscriptArtifacts = async (input: {
  jobId: string;
  sceneId: number;
  providerJobId: string;
  normalizedTranscript: NormalizedSceneVideoTranscript;
  vttText: string;
  srtText: string;
}) => {
  const keys = buildSceneVideoTranscriptArtifactKeys(input);
  await Promise.all([
    putJsonToS3(keys.jsonKey, input.normalizedTranscript),
    putBufferToS3(keys.vttKey, input.vttText, "text/vtt; charset=utf-8"),
    putBufferToS3(keys.srtKey, input.srtText, "application/x-subrip"),
  ]);
  return keys;
};

export const saveSceneVideoTranscriptState = async (input: {
  jobId: string;
  sceneId: number;
  transcript: SceneVideoTranscript;
}) => {
  await upsertSceneAsset(input.jobId, input.sceneId, {
    videoTranscript: input.transcript,
  });
};
