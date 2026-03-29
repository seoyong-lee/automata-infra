declare module "*.mjs" {
  export function buildSceneTransitionGraph(
    segmentInputs: Array<{
      segmentPath: string;
      durationSec?: number;
      scene?: {
        sceneId?: number;
        startTransition?: {
          type?: string;
          durationSec?: number;
        };
      };
    }>,
  ): {
    filterComplex: string;
    videoLabel: string;
    audioLabel: string;
  } | null;

  const moduleExports: unknown;
  export default moduleExports;
}
