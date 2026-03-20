const getRequiredPreviewDomain = (): string => {
  const domain = process.env.PREVIEW_DISTRIBUTION_DOMAIN;
  if (!domain) {
    throw new Error("PREVIEW_DISTRIBUTION_DOMAIN is required");
  }
  return domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
};

const buildAssetUrl = (s3Key?: unknown): string | undefined => {
  if (typeof s3Key !== "string" || s3Key.trim().length === 0) {
    return undefined;
  }
  const domain = getRequiredPreviewDomain();
  const path = s3Key.replace(/^\/+/, "");
  return `https://${domain}/${path}`;
};

type RenderPlanScene = {
  sceneId: number;
  startSec: number;
  endSec: number;
  imageS3Key?: string;
  videoClipS3Key?: string;
  voiceS3Key?: string;
  subtitle?: string;
};

type RenderPlan = {
  videoTitle?: string;
  language?: string;
  totalDurationSec: number;
  scenes: RenderPlanScene[];
};

const buildVisualAsset = (scene: RenderPlanScene) => {
  const videoUrl = buildAssetUrl(scene.videoClipS3Key);
  if (videoUrl) {
    return {
      type: "video",
      src: videoUrl,
    };
  }

  const imageUrl = buildAssetUrl(scene.imageS3Key);
  if (imageUrl) {
    return {
      type: "image",
      src: imageUrl,
    };
  }

  return {
    type: "title",
    text: "Missing visual asset",
    style: "minimal",
  };
};

const buildTextAsset = (scene: RenderPlanScene) => {
  return {
    type: "title",
    text: scene.subtitle ?? "",
    style: "minimal",
  };
};

const buildAudioAsset = (scene: RenderPlanScene) => {
  const voiceUrl = buildAssetUrl(scene.voiceS3Key);
  if (!voiceUrl) {
    return undefined;
  }
  return {
    asset: {
      type: "audio",
      src: voiceUrl,
    },
    start: scene.startSec,
    length: Math.max(0.1, scene.endSec - scene.startSec),
  };
};

export const mapRenderPlanToShotstackEdit = (
  renderPlan: Record<string, unknown>,
): Record<string, unknown> => {
  const parsed = renderPlan as RenderPlan;
  const tracks = [
    {
      clips: parsed.scenes.map((scene) => ({
        asset: buildVisualAsset(scene),
        start: scene.startSec,
        length: Math.max(0.1, scene.endSec - scene.startSec),
        fit: "cover",
      })),
    },
    {
      clips: parsed.scenes
        .filter((scene) => Boolean(scene.subtitle))
        .map((scene) => ({
          asset: buildTextAsset(scene),
          start: scene.startSec,
          length: Math.max(0.1, scene.endSec - scene.startSec),
          position: "center",
          offset: {
            y: 0.35,
          },
        })),
    },
    {
      clips: parsed.scenes
        .map(buildAudioAsset)
        .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip)),
    },
  ];

  return {
    timeline: {
      background: "#000000",
      tracks,
    },
    output: {
      format: "mp4",
      fps: 30,
      size: {
        width: 1080,
        height: 1920,
      },
    },
    merge: [
      {
        find: "TITLE",
        replace: parsed.videoTitle ?? "Untitled",
      },
    ],
  };
};
