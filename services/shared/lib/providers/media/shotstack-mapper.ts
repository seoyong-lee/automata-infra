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
const KOREAN_SUBTITLE_FONT_URL =
  "https://github.com/frappe/fonts/raw/refs/heads/master/usr_share_fonts/noto/NotoSansKR-Regular.otf";

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
  subtitleSrtS3Key?: string;
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

const buildSubtitleTrack = (subtitleSrtS3Key: string) => {
  const subtitleUrl = buildAssetUrl(subtitleSrtS3Key);
  if (!subtitleUrl) {
    return undefined;
  }
  return {
    clips: [
      {
        asset: {
          type: "caption",
          src: subtitleUrl,
          font: {
            family: "Noto Sans KR",
            color: "#ffffff",
            size: 28,
            lineHeight: 1.15,
            stroke: "#000000",
            strokeWidth: 0.6,
          },
          background: {
            color: "#000000",
            opacity: 0.45,
            padding: 12,
            borderRadius: 12,
          },
          width: 920,
        },
        start: 0,
        length: "end",
        position: "bottom",
        offset: {
          y: 0.08,
        },
      },
    ],
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
    return /^https?:\/\//i.test(renderPlan.soundtrackSrc)
      ? renderPlan.soundtrackSrc
      : buildAssetUrl(renderPlan.soundtrackSrc);
  }
  const envDefault = process.env.DEFAULT_SHOTSTACK_SOUNDTRACK_URL?.trim();
  if (envDefault) {
    return envDefault;
  }
  const mood = renderPlan.soundtrackMood?.trim().toLowerCase();
  return mood ? DEFAULT_SOUNDTRACK_BY_MOOD[mood] : undefined;
};

const buildShotstackTracks = (
  renderPlan: RenderPlan,
): Array<Record<string, unknown>> => {
  const subtitleTrack =
    renderPlan.burnInSubtitles && renderPlan.subtitleSrtS3Key
      ? buildSubtitleTrack(renderPlan.subtitleSrtS3Key)
      : undefined;

  return [
    {
      clips: renderPlan.scenes.map((scene) => ({
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
      clips: renderPlan.scenes
        .map(buildAudioAsset)
        .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip)),
    },
    ...(subtitleTrack ? [subtitleTrack] : []),
  ];
};

const buildShotstackFonts = (
  renderPlan: RenderPlan,
): Array<{ src: string }> | undefined => {
  if (!renderPlan.burnInSubtitles || !renderPlan.subtitleSrtS3Key) {
    return undefined;
  }
  return [{ src: KOREAN_SUBTITLE_FONT_URL }];
};

export const mapRenderPlanToShotstackEdit = (
  renderPlan: Record<string, unknown>,
): Record<string, unknown> => {
  const parsed = renderPlan as RenderPlan;
  const soundtrackSrc = resolveSoundtrackSrc(parsed);
  const fonts = buildShotstackFonts(parsed);
  const tracks = buildShotstackTracks(parsed);

  return {
    timeline: {
      background: "#000000",
      ...(fonts
        ? {
            fonts,
          }
        : {}),
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
