import type {
  SceneStartTransition,
  SceneVisualNeed,
} from "../../services/shared/lib/contracts/canonical-io-schemas";

export type SceneDefinition = {
  sceneId: number;
  durationSec: number;
  narration: string;
  disableNarration?: boolean;
  imagePrompt: string;
  videoPrompt?: string;
  subtitle: string;
  bgmMood?: string;
  sfx?: string[];
  storyBeat?: string;
  visualNeed?: SceneVisualNeed;
  startTransition?: SceneStartTransition;
};

export type SceneJson = {
  videoTitle: string;
  language: string;
  scenes: SceneDefinition[];
};
