import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createVoicePostprocessResult } from "../mapper/render-result.mjs";

function buildAtempoFilter(tempo) {
  const safeTempo = Math.max(0.5, tempo);
  const filters = [];
  let remaining = safeTempo;
  while (remaining > 2) {
    filters.push("atempo=2.0");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(",");
}

export async function postProcessVoice(input) {
  const {
    jobId,
    inputAudioS3Key,
    outputAudioS3Key,
    targetDurationSec,
    inputDurationSec,
    storageRepo,
    mediaToolsRepo,
    now = () => new Date().toISOString(),
  } = input;

  const workDir = await fs.mkdtemp(path.join(tmpdir(), `voice-${jobId}-`));
  const inputPath = path.join(
    workDir,
    `input${path.extname(inputAudioS3Key) || ".mp3"}`,
  );
  const outputPath = path.join(workDir, "output.mp3");

  await storageRepo.downloadObject(inputAudioS3Key, inputPath);

  const safeInputDurationSec =
    Number.isFinite(inputDurationSec) && inputDurationSec > 0
      ? inputDurationSec
      : (await mediaToolsRepo.getMediaDurationSec(inputPath)) ?? targetDurationSec;
  const target = Math.max(0.1, targetDurationSec);
  const tempo = Math.max(1, safeInputDurationSec / target);

  await mediaToolsRepo.runCommand("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-filter:a",
    buildAtempoFilter(tempo),
    "-vn",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    outputPath,
  ]);

  const resolvedDurationSec =
    (await mediaToolsRepo.getMediaDurationSec(outputPath)) ?? target;
  await storageRepo.uploadFile(outputAudioS3Key, outputPath, "audio/mpeg");

  return createVoicePostprocessResult({
    outputAudioS3Key,
    durationSec: resolvedDurationSec,
    adjustedAt: now(),
    tempoApplied: tempo,
  });
}
