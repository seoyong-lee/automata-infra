import type {
  RenderPlan,
  RenderPlanCanvas,
  RenderPlanMediaFrame,
  RenderPlanOverlay,
  RenderPlanScene,
} from "../../../types/render/render-plan";
import type {
  JobRenderSettings,
  SceneStartTransition,
} from "../../shared/lib/contracts/canonical-io-schemas";
import type { ResolvedPolicy } from "../../shared/lib/contracts/content-presets";
import type { ElevenLabsStoredAlignmentDocument } from "../../shared/lib/contracts/elevenlabs-tts-alignment";

export type RenderPlanEvent = {
  jobId: string;
  sceneJson: {
    videoTitle: string;
    language: string;
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      narration: string;
      disableNarration?: boolean;
      subtitle: string;
      bgmMood?: string;
      sfx?: string[];
      startTransition?: SceneStartTransition;
    }>;
  };
  imageAssets?: Array<{
    sceneId: number;
    imageS3Key?: string;
  }>;
  videoAssets?: Array<{
    sceneId: number;
    videoClipS3Key?: string;
  }>;
  voiceAssets?: Array<{
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
    /** S3 JSON written at TTS time; loaded in `resolveRenderPlanAssets`. */
    voiceAlignmentS3Key?: string;
    /** In-memory alignment payload (e.g. after S3 load). */
    elevenLabsAlignment?: ElevenLabsStoredAlignmentDocument;
  }>;
  overlays?: RenderPlanOverlay[];
};

export type RenderPolicyConfig = {
  output: RenderPlan["output"];
  canvas: RenderPlanCanvas;
  mediaFrame: RenderPlanMediaFrame;
  previewMaxDurationSec: number;
  subtitles: RenderPlan["subtitles"];
  sceneGapSec: number;
  defaultOverlays: RenderPlanOverlay[];
};

export type StoredRenderInputs = {
  resolvedPolicy?: ResolvedPolicy;
  renderSettings?: JobRenderSettings;
};

export type RenderPlanSceneInput =
  RenderPlanEvent["sceneJson"]["scenes"][number];
export type RenderPlanVoiceAsset = NonNullable<
  RenderPlanEvent["voiceAssets"]
>[number];

export type ResolvedRenderPlanAssets = {
  imageAssets: NonNullable<RenderPlanEvent["imageAssets"]>;
  voiceAssets: NonNullable<RenderPlanEvent["voiceAssets"]>;
  videoAssets: NonNullable<RenderPlanEvent["videoAssets"]>;
};

export type BuiltRenderPlanScenes = {
  totalDurationSec: number;
  scenes: RenderPlanScene[];
};
