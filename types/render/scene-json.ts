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
};

export type SceneJson = {
  videoTitle: string;
  language: string;
  scenes: SceneDefinition[];
};
