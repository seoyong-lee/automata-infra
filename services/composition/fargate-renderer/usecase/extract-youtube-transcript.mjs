import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function sanitizeKeyPart(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}

async function runYtDlp(args, cwd) {
  try {
    await execFileAsync("yt-dlp", args, {
      cwd,
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    const stderr = error?.stderr ?? error?.message ?? String(error);
    throw new Error(`yt-dlp failed: ${String(stderr).trim()}`);
  }
}

async function listVttFiles(workDir) {
  const entries = await fs.readdir(workDir);
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.toLowerCase().endsWith(".vtt"))
      .filter((entry) => !entry.toLowerCase().includes("live_chat"))
      .map(async (entry) => {
        const filePath = path.join(workDir, entry);
        const stats = await fs.stat(filePath);
        return {
          entry,
          filePath,
          size: stats.size,
        };
      }),
  );
  return candidates.sort((left, right) => right.size - left.size);
}

function extractLanguageCode(baseName, fileName) {
  if (!fileName.startsWith(`${baseName}.`) || !fileName.endsWith(".vtt")) {
    return undefined;
  }
  const languageCode = fileName.slice(baseName.length + 1, -4).trim();
  return languageCode.length > 0 ? languageCode : undefined;
}

function buildSubtitleLangs(preferredLanguage) {
  const normalized = preferredLanguage?.trim().toLowerCase();
  if (!normalized) {
    return "all,-live_chat";
  }
  return `${normalized}.*,${normalized},all,-live_chat`;
}

function buildAudioContentType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".m4a")) {
    return "audio/mp4";
  }
  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  if (lower.endsWith(".webm")) {
    return "audio/webm";
  }
  return "application/octet-stream";
}

async function listAudioFiles(workDir) {
  const entries = await fs.readdir(workDir);
  const candidates = await Promise.all(
    entries
      .filter((entry) => /\.(m4a|mp3|wav|webm)$/i.test(entry))
      .map(async (entry) => {
        const filePath = path.join(workDir, entry);
        const stats = await fs.stat(filePath);
        return {
          entry,
          filePath,
          size: stats.size,
        };
      }),
  );
  return candidates.sort((left, right) => right.size - left.size);
}

export async function extractYoutubeTranscript(input) {
  const transcriptId = input.transcriptId?.trim();
  const baseName = transcriptId
    ? `transcript-${sanitizeKeyPart(transcriptId)}`
    : `scene-${input.sceneId}`;
  const workDir = await fs.mkdtemp(path.join(tmpdir(), "yt-dlp-"));
  const targetPrefix = transcriptId
    ? `assets/transcripts/${transcriptId}/youtube`
    : `assets/${input.jobId}/transcript/scene-${input.sceneId}/youtube`;

  try {
    await runYtDlp(
      [
        "--skip-download",
        "--no-progress",
        "--no-warnings",
        "--no-playlist",
        "--restrict-filenames",
        "--write-subs",
        "--write-auto-subs",
        "--sub-format",
        "vtt",
        "--sub-langs",
        buildSubtitleLangs(input.preferredLanguage),
        "--output",
        `${baseName}.%(ext)s`,
        input.youtubeUrl,
      ],
      workDir,
    );

    const candidates = await listVttFiles(workDir);
    const selected = candidates[0];
    if (selected) {
      const languageCode = extractLanguageCode(baseName, selected.entry);
      const transcriptVttS3Key = `${targetPrefix}/${sanitizeKeyPart(selected.entry)}`;
      await input.storageRepo.uploadFile(
        transcriptVttS3Key,
        selected.filePath,
        "text/vtt; charset=utf-8",
      );

      return {
        transcriptVttS3Key,
        provider: "fargate-yt-dlp",
        extractionMode: "SUBTITLES",
        languageCode,
        sourceUrl: input.youtubeUrl,
        extractedAt: new Date().toISOString(),
      };
    }

    await runYtDlp(
      [
        "--extract-audio",
        "--audio-format",
        "m4a",
        "--no-progress",
        "--no-warnings",
        "--no-playlist",
        "--restrict-filenames",
        "--output",
        `${baseName}.%(ext)s`,
        input.youtubeUrl,
      ],
      workDir,
    );
    const audioCandidates = await listAudioFiles(workDir);
    const selectedAudio = audioCandidates[0];
    if (!selectedAudio) {
      throw new Error("No YouTube subtitles or downloadable audio were available");
    }

    const audioS3Key = `${targetPrefix}/${sanitizeKeyPart(selectedAudio.entry)}`;
    await input.storageRepo.uploadFile(
      audioS3Key,
      selectedAudio.filePath,
      buildAudioContentType(selectedAudio.entry),
    );
    return {
      audioS3Key,
      provider: "fargate-yt-dlp",
      extractionMode: "AUDIO_FALLBACK",
      sourceUrl: input.youtubeUrl,
      extractedAt: new Date().toISOString(),
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
