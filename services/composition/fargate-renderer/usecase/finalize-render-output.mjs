import path from "node:path";
import { promises as fs } from "node:fs";
import { seconds } from "../normalize/render-plan.mjs";

export async function concatSegments(
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
