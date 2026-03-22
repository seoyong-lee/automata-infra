const getRequiredPreviewDomain = (): string => {
  const domain =
    process.env.PREVIEW_DISTRIBUTION_DOMAIN ??
    process.env.NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN;
  if (!domain) {
    throw new Error(
      "PREVIEW_DISTRIBUTION_DOMAIN is required (or NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN as fallback)",
    );
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

const DEFAULT_SOUNDTRACK_BY_MOOD: Record<string, string> = {
  dark_ambient:
    "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/music/moment.mp3",
  mystery:
    "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/music/moment.mp3",
  calm: "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/music/moment.mp3",
};

type RenderPlanScene = {
  sceneId: number;
  startSec: number;
  endSec: number;
  imageS3Key?: string;
  videoClipS3Key?: string;
  voiceS3Key?: string;
  subtitle?: string;
  bgmMood?: string;
  sfx?: string[];
};

type RenderPlan = {
  videoTitle?: string;
  language?: string;
  burnInSubtitles?: boolean;
  totalDurationSec: number;
  soundtrackMood?: string;
  soundtrackSrc?: string;
  output?: {
    width?: number;
    height?: number;
    format?: string;
    fps?: number;
  };
  scenes: RenderPlanScene[];
};

const buildSubtitleTrack = (scenes: RenderPlanScene[]) => {
  return {
    clips: scenes
      .filter(
        (scene) =>
          typeof scene.subtitle === "string" &&
          scene.subtitle.trim().length > 0,
      )
      .map((scene) => ({
        asset: {
          type: "text",
          text: scene.subtitle,
          font: {
            family: "Noto Sans KR",
            color: "#ffffff",
            size: 28,
          },
          alignment: {
            horizontal: "center",
          },
          stroke: {
            color: "#000000",
            width: 2,
          },
        },
        start: scene.startSec,
        length: Math.max(0.1, scene.endSec - scene.startSec),
        transition: {
          in: "fade",
          out: "fade",
        },
        position: "bottom",
        offset: {
          y: 0.08,
        },
      })),
  };
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
    type: "text",
    text: "Missing visual asset",
    font: {
      family: "Montserrat ExtraBold",
      color: "#ffffff",
      size: 32,
    },
    alignment: {
      horizontal: "center",
    },
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

const resolveSoundtrackSrc = (renderPlan: RenderPlan): string | undefined => {
  if (
    typeof renderPlan.soundtrackSrc === "string" &&
    renderPlan.soundtrackSrc.trim().length > 0
  ) {
    return renderPlan.soundtrackSrc;
  }
  const envDefault = process.env.DEFAULT_SHOTSTACK_SOUNDTRACK_URL?.trim();
  if (envDefault) {
    return envDefault;
  }
  const mood = renderPlan.soundtrackMood?.trim().toLowerCase();
  return mood ? DEFAULT_SOUNDTRACK_BY_MOOD[mood] : undefined;
};

export const mapRenderPlanToShotstackEdit = (
  renderPlan: Record<string, unknown>,
): Record<string, unknown> => {
  const parsed = renderPlan as RenderPlan;
  const soundtrackSrc = resolveSoundtrackSrc(parsed);
  const tracks = [
    {
      clips: parsed.scenes.map((scene) => ({
        asset: buildVisualAsset(scene),
        start: scene.startSec,
        length: Math.max(0.1, scene.endSec - scene.startSec),
        fit: "cover",
        transition: {
          in: "fade",
          out: "fade",
        },
      })),
    },
    {
      clips: parsed.scenes
        .map(buildAudioAsset)
        .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip)),
    },
    ...(parsed.burnInSubtitles ? [buildSubtitleTrack(parsed.scenes)] : []),
  ];

  return {
    timeline: {
      background: "#000000",
      ...(soundtrackSrc
        ? {
            soundtrack: {
              src: soundtrackSrc,
              effect: "fadeOut",
            },
          }
        : {}),
      tracks,
    },
    output: {
      format: parsed.output?.format ?? "mp4",
      fps: parsed.output?.fps ?? 30,
      size: {
        width: parsed.output?.width ?? 1080,
        height: parsed.output?.height ?? 1920,
      },
    },
  };
};
