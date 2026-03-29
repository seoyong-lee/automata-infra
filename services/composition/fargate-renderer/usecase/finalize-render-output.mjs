import path from "node:path";
import { promises as fs } from "node:fs";
import { seconds } from "../normalize/render-plan.mjs";

const CUT_TRANSITION_EPSILON_SEC = 0.001;
const DEFAULT_SCENE_TRANSITION_DURATION_SEC = 0.45;
const MAX_SCENE_TRANSITION_DURATION_SEC = 1.5;
const SUPPORTED_SCENE_TRANSITIONS = new Set([
  "cut",
  "fade",
  "dissolve",
  "fadeblack",
  "fadewhite",
  "wipeleft",
  "wiperight",
  "wipeup",
  "wipedown",
  "slideleft",
  "slideright",
  "slideup",
  "slidedown",
  "smoothleft",
  "smoothright",
  "smoothup",
  "smoothdown",
]);

function formatFilterNumber(value) {
  return Number(value).toFixed(3);
}

function normalizeSegmentInput(segmentInput) {
  if (typeof segmentInput === "string") {
    return {
      segmentPath: segmentInput,
      durationSec: undefined,
      scene: undefined,
    };
  }
  return {
    segmentPath: segmentInput.segmentPath,
    durationSec:
      typeof segmentInput.durationSec === "number" &&
      Number.isFinite(segmentInput.durationSec)
        ? segmentInput.durationSec
        : undefined,
    scene: segmentInput.scene,
  };
}

export function resolveSceneStartTransition(scene) {
  const rawType = String(scene?.startTransition?.type ?? "cut")
    .trim()
    .toLowerCase();
  const type = SUPPORTED_SCENE_TRANSITIONS.has(rawType) ? rawType : "cut";
  const requestedDuration = Number(
    scene?.startTransition?.durationSec ?? DEFAULT_SCENE_TRANSITION_DURATION_SEC,
  );
  return {
    type,
    durationSec:
      type === "cut"
        ? CUT_TRANSITION_EPSILON_SEC
        : Number.isFinite(requestedDuration) && requestedDuration > 0
          ? Math.min(MAX_SCENE_TRANSITION_DURATION_SEC, requestedDuration)
          : DEFAULT_SCENE_TRANSITION_DURATION_SEC,
  };
}

export function buildSceneTransitionGraph(segmentInputs) {
  const normalizedInputs = segmentInputs.map(normalizeSegmentInput);
  if (normalizedInputs.length < 2) {
    return null;
  }
  const transitions = normalizedInputs
    .slice(1)
    .map((segmentInput) => resolveSceneStartTransition(segmentInput.scene));
  if (!transitions.some((transition) => transition.type !== "cut")) {
    return null;
  }

  const filters = [];
  let currentVideoLabel = "0:v";
  let currentAudioLabel = "0:a";
  let currentDurationSec = Math.max(
    CUT_TRANSITION_EPSILON_SEC,
    Number(normalizedInputs[0]?.durationSec ?? 0),
  );

  for (let index = 1; index < normalizedInputs.length; index += 1) {
    const transition = transitions[index - 1];
    const nextDurationSec = Math.max(
      CUT_TRANSITION_EPSILON_SEC,
      Number(normalizedInputs[index]?.durationSec ?? 0),
    );
    const maxAvailableDurationSec = Math.max(
      CUT_TRANSITION_EPSILON_SEC,
      Math.min(
        currentDurationSec - 0.05,
        nextDurationSec - 0.05,
        MAX_SCENE_TRANSITION_DURATION_SEC,
      ),
    );
    const transitionDurationSec = Math.max(
      CUT_TRANSITION_EPSILON_SEC,
      Math.min(transition.durationSec, maxAvailableDurationSec),
    );
    const transitionType = transition.type === "cut" ? "fade" : transition.type;
    const videoOutputLabel =
      index === normalizedInputs.length - 1 ? "vout" : `v${index}`;
    const audioOutputLabel =
      index === normalizedInputs.length - 1 ? "aout" : `a${index}`;
    const offsetSec = Math.max(0, currentDurationSec - transitionDurationSec);

    filters.push(
      `[${currentVideoLabel}][${index}:v]xfade=transition=${transitionType}:duration=${formatFilterNumber(transitionDurationSec)}:offset=${formatFilterNumber(offsetSec)}[${videoOutputLabel}]`,
    );
    filters.push(
      `[${currentAudioLabel}][${index}:a]acrossfade=d=${formatFilterNumber(transitionDurationSec)}:c1=tri:c2=tri[${audioOutputLabel}]`,
    );

    currentVideoLabel = videoOutputLabel;
    currentAudioLabel = audioOutputLabel;
    currentDurationSec = currentDurationSec + nextDurationSec - transitionDurationSec;
  }

  return {
    filterComplex: filters.join(";"),
    videoLabel: `[${currentVideoLabel}]`,
    audioLabel: `[${currentAudioLabel}]`,
  };
}

async function concatWithoutTransitions(
  segmentPaths,
  workDir,
  outputPath,
  mediaToolsRepo,
) {
  const listPath = path.join(workDir, "segments.txt");
  await fs.writeFile(
    listPath,
    segmentPaths
      .map((segmentPath) => `file '${segmentPath.replace(/'/g, "'\\''")}'`)
      .join("\n"),
    "utf8",
  );
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath,
  ]);
}

export async function concatSegments(
  segmentInputs,
  workDir,
  outputPath,
  mediaToolsRepo,
) {
  const normalizedInputs = segmentInputs.map(normalizeSegmentInput);
  const transitionGraph = buildSceneTransitionGraph(normalizedInputs);
  const segmentPaths = normalizedInputs.map((segmentInput) => segmentInput.segmentPath);

  if (!transitionGraph) {
    await concatWithoutTransitions(segmentPaths, workDir, outputPath, mediaToolsRepo);
    return;
  }

  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    ...segmentPaths.flatMap((segmentPath) => ["-i", segmentPath]),
    "-filter_complex",
    transitionGraph.filterComplex,
    "-map",
    transitionGraph.videoLabel,
    "-map",
    transitionGraph.audioLabel,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

export async function maybeDownloadSoundtrack(
  renderPlan,
  workDir,
  storageRepo,
) {
  if (typeof renderPlan.soundtrackSrc !== "string" || !renderPlan.soundtrackSrc) {
    return undefined;
  }
  if (/^https?:\/\//.test(renderPlan.soundtrackSrc)) {
    const response = await fetch(renderPlan.soundtrackSrc);
    if (!response.ok) {
      throw new Error(`Failed to download soundtrack: ${response.status}`);
    }
    const soundtrackPath = path.join(
      workDir,
      `soundtrack${path.extname(new URL(renderPlan.soundtrackSrc).pathname) || ".bin"}`,
    );
    await fs.writeFile(soundtrackPath, Buffer.from(await response.arrayBuffer()));
    return soundtrackPath;
  }
  const soundtrackPath = path.join(
    workDir,
    `soundtrack${path.extname(renderPlan.soundtrackSrc) || ".bin"}`,
  );
  await storageRepo.downloadObject(renderPlan.soundtrackSrc, soundtrackPath);
  return soundtrackPath;
}

export async function mixSoundtrack(
  baseVideoPath,
  soundtrackPath,
  totalDurationSec,
  outputPath,
  mediaToolsRepo,
) {
  if (!soundtrackPath) {
    await fs.copyFile(baseVideoPath, outputPath);
    return;
  }
  const fadeDuration = Math.min(2, Math.max(0.2, totalDurationSec));
  const fadeStart = Math.max(totalDurationSec - fadeDuration, 0);
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-i",
    baseVideoPath,
    "-stream_loop",
    "-1",
    "-i",
    soundtrackPath,
    "-filter_complex",
    `[1:a]volume=0.18,atrim=0:${totalDurationSec},afade=t=out:st=${fadeStart}:d=${fadeDuration}[bgm];[0:a][bgm]amix=inputs=2:normalize=0:duration=first[aout]`,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

export async function createPreview(
  finalVideoPath,
  renderPlan,
  previewPath,
  mediaToolsRepo,
) {
  const maxDurationSec = Number(renderPlan.preview?.maxDurationSec ?? 12);
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-i",
    finalVideoPath,
    "-t",
    String(seconds(maxDurationSec)),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    previewPath,
  ]);
}

export async function createThumbnail(
  finalVideoPath,
  renderPlan,
  thumbnailPath,
  mediaToolsRepo,
) {
  const totalDurationSec = Math.max(0.1, Number(renderPlan.totalDurationSec ?? 1));
  const thumbnailSec = Math.max(0.1, Math.min(3, totalDurationSec - 0.1));
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-ss",
    String(thumbnailSec),
    "-i",
    finalVideoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    thumbnailPath,
  ]);
}
