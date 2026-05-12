import { promises as fs } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stripUrlQueryAndHash = (value) => {
  const s = String(value).trim();
  const noHash = s.split("#")[0] ?? "";
  return (noHash.split("?")[0] ?? "").trim();
};

/**
 * GetObject용 키: 공백·선행 `/` 제거, `s3://bucket/key`는 bucket이 일치할 때만 key만 사용.
 * 잘못된 `?…`가 붙은 키로 로컬 파일명이 `source.mp4?…`가 되어 ffmpeg 입력과 어긋나는 문제를 막는다.
 */
const normalizeSourceVideoObjectKey = (rawKey, expectedBucketName) => {
  let key = stripUrlQueryAndHash(rawKey);
  if (!key) {
    throw new Error("SOURCE_VIDEO_S3_KEY is empty after normalization");
  }
  key = key.replace(/^\/+/, "");
  const m = key.match(/^s3:\/\/([^/]+)\/(.+)$/i);
  if (m) {
    const bucket = m[1];
    const rest = (m[2] ?? "").replace(/^\/+/, "");
    if (
      expectedBucketName &&
      bucket.toLowerCase() !== String(expectedBucketName).toLowerCase()
    ) {
      throw new Error(
        `SOURCE_VIDEO_S3_KEY uses bucket "${bucket}" but ASSETS_BUCKET_NAME is "${expectedBucketName}"`,
      );
    }
    return rest;
  }
  return key;
};

/** 로컬 임시 파일 확장자 (path.extname은 `?query`까지 확장자로 잡을 수 있음) */
const inferVideoFileExtension = (objectKey) => {
  const base = objectKey.split("/").pop() ?? "";
  const match = base.match(/\.(mp4|mov|webm|m4v)$/i);
  if (match) {
    return `.${match[1].toLowerCase()}`;
  }
  return ".mp4";
};

const parsePtsTimesFromFfmpegLog = (text) => {
  if (!text || typeof text !== "string") {
    return [];
  }
  const re = /pts_time:([\d.]+)/g;
  const out = [];
  let match = re.exec(text);
  while (match) {
    const t = Number(match[1]);
    if (Number.isFinite(t) && t >= 0) {
      out.push(t);
    }
    match = re.exec(text);
  }
  return out;
};

const mergeCloseTimes = (sortedTimes, minGapSec) => {
  if (sortedTimes.length === 0) {
    return [];
  }
  const gap = Math.max(0.05, minGapSec);
  const merged = [sortedTimes[0]];
  for (let i = 1; i < sortedTimes.length; i += 1) {
    const t = sortedTimes[i];
    if (t - merged[merged.length - 1] >= gap) {
      merged.push(t);
    }
  }
  return merged;
};

const downsampleTimesToMax = (times, maxCount) => {
  if (times.length <= maxCount) {
    return times.slice();
  }
  if (maxCount === 1) {
    return [times[0]];
  }
  const picked = new Set();
  for (let i = 0; i < maxCount; i += 1) {
    const idx = Math.round((i * (times.length - 1)) / (maxCount - 1));
    picked.add(times[idx]);
  }
  return [...picked].sort((a, b) => a - b);
};

const buildUniformOffsets = (durationSec, count, intervalHint) => {
  const n = Math.max(1, Math.floor(count));
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return Array.from({ length: n }, (_, i) => i * intervalHint);
  }
  if (n === 1) {
    return [0];
  }
  return Array.from({ length: n }, (_, i) =>
    clamp((i * durationSec) / (n - 1), 0, Math.max(0, durationSec - 0.05)),
  );
};

/**
 * 컷이 적을 때 `targetMin`까지 균등 시점을 채워 넣는다 (기존 시점과 minSep 이상 떨어짐).
 */
const augmentTimesToMinCount = (
  baseSorted,
  durationSec,
  targetMin,
  maxCount,
  minSep,
) => {
  const cap = Math.min(maxCount, Math.max(targetMin, baseSorted.length));
  const anchors = buildUniformOffsets(durationSec, cap, 1);
  const merged = [...new Set([...baseSorted, ...anchors])].sort(
    (a, b) => a - b,
  );
  return mergeCloseTimes(merged, minSep).slice(0, maxCount);
};

async function detectSceneCutTimesSec(input) {
  const { localVideo, mediaToolsRepo, sceneThreshold, minSceneGapSec } =
    input;
  const threshold = clamp(sceneThreshold, 0.12, 0.85);
  const vf = `select='gt(scene\\,${threshold})',showinfo`;
  try {
    const { stderr, stdout } = await mediaToolsRepo.runCommand(
      "ffmpeg",
      [
        "-hide_banner",
        "-nostats",
        "-loglevel",
        "info",
        "-i",
        localVideo,
        "-vf",
        vf,
        "-f",
        "null",
        "-",
      ],
      { capture: true },
    );
    const raw = parsePtsTimesFromFfmpegLog(`${stdout}\n${stderr}`);
    const sorted = [...new Set(raw)].sort((a, b) => a - b);
    return mergeCloseTimes(sorted, minSceneGapSec);
  } catch {
    return [];
  }
}

async function extractUniformFrames(input) {
  const {
    jobId,
    sourceVideoS3Key,
    storageRepo,
    mediaToolsRepo,
    localVideo,
    workDir,
    sampleIntervalSec,
    maxFrames,
  } = input;
  const outPattern = path.join(workDir, "frame-%04d.jpg");
  const vf = `fps=1/${sampleIntervalSec}`;
  await mediaToolsRepo.runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    localVideo,
    "-vf",
    vf,
    "-frames:v",
    String(maxFrames),
    "-q:v",
    "3",
    outPattern,
  ]);

  const dirEntries = await fs.readdir(workDir);
  const files = dirEntries
    .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
    .sort();

  if (files.length === 0) {
    throw new Error("ffmpeg produced no frame JPEGs");
  }

  const prefix = `jobs/${jobId}/source-video-insight/frames`;
  const frames = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const offsetSec = i * sampleIntervalSec;
    const key = `${prefix}/t-${String(Math.round(offsetSec * 1000)).padStart(8, "0")}.jpg`;
    await storageRepo.uploadFile(
      key,
      path.join(workDir, file),
      "image/jpeg",
    );
    frames.push({ offsetSec, imageS3Key: key });
  }

  return {
    provider: "fargate-ffmpeg-frame-extract",
    sourceVideoS3Key,
    extractionStrategy: "UNIFORM",
    sampleIntervalSec,
    maxFrames,
    cutTimesSec: [],
    frames,
    extractedAt: new Date().toISOString(),
  };
}

async function extractSceneCutFrames(input) {
  const {
    jobId,
    sourceVideoS3Key,
    storageRepo,
    mediaToolsRepo,
    localVideo,
    workDir,
    sampleIntervalSec,
    maxFrames,
    sceneThreshold,
    minSceneGapSec,
    getMediaDurationSec,
  } = input;

  const durationSec =
    (await getMediaDurationSec?.(localVideo)) ??
    (await mediaToolsRepo.getMediaDurationSec(localVideo));

  let cutTimes = await detectSceneCutTimesSec({
    localVideo,
    mediaToolsRepo,
    sceneThreshold,
    minSceneGapSec,
  });

  if (cutTimes.length === 0 && Number.isFinite(durationSec) && durationSec > 0) {
    cutTimes = [0];
  } else if (
    cutTimes.length > 0 &&
    Number.isFinite(durationSec) &&
    durationSec > 0 &&
    cutTimes[0] > minSceneGapSec
  ) {
    cutTimes = [0, ...cutTimes];
  }

  cutTimes = mergeCloseTimes(cutTimes, minSceneGapSec);

  let selected = downsampleTimesToMax(cutTimes, maxFrames);

  const targetMin = Math.min(6, maxFrames);
  if (
    selected.length < targetMin &&
    Number.isFinite(durationSec) &&
    durationSec > 1
  ) {
    selected = augmentTimesToMinCount(
      selected,
      durationSec,
      targetMin,
      maxFrames,
      minSceneGapSec * 0.75,
    );
  }

  if (selected.length === 0) {
    return extractUniformFrames({
      jobId,
      sourceVideoS3Key,
      storageRepo,
      mediaToolsRepo,
      localVideo,
      workDir,
      sampleIntervalSec,
      maxFrames,
    });
  }

  const prefix = `jobs/${jobId}/source-video-insight/frames`;
  const frames = [];

  for (let i = 0; i < selected.length; i += 1) {
    const offsetSec = Math.round(selected[i] * 1000) / 1000;
    const outFile = path.join(workDir, `cut-${String(i).padStart(3, "0")}.jpg`);
    await mediaToolsRepo.runCommand("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      localVideo,
      "-ss",
      String(offsetSec),
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outFile,
    ]);
    const key = `${prefix}/t-${String(Math.round(offsetSec * 1000)).padStart(8, "0")}.jpg`;
    await storageRepo.uploadFile(key, outFile, "image/jpeg");
    frames.push({ offsetSec, imageS3Key: key });
  }

  return {
    provider: "fargate-ffmpeg-scene-cut-extract",
    sourceVideoS3Key,
    extractionStrategy: "SCENE_CUT",
    sampleIntervalSec,
    maxFrames,
    cutTimesSec: cutTimes.slice(0, 64),
    frames,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * 소스 영상에서 JPEG 프레임을 뽑아 S3에 올리고, Vision/LLM 다음 단계용 메타를 반환한다.
 * UNIFORM: fps 샘플링. SCENE_CUT: 장면 전환 감지 후 대표 시점만 (부족 시 균등 보강).
 */
export async function extractSourceVideoFrames(input) {
  const {
    jobId,
    sourceVideoS3Key,
    assetsBucketName,
    storageRepo,
    mediaToolsRepo,
    sampleIntervalSec: rawInterval,
    maxFrames: rawMax,
    extractionStrategy = "UNIFORM",
    sceneThreshold: rawSceneThresh,
    minSceneGapSec: rawGap,
  } = input;

  const sampleIntervalSec = clamp(
    Number.isFinite(Number(rawInterval)) ? Number(rawInterval) : 2,
    0.5,
    30,
  );
  const maxFrames = clamp(
    Number.isFinite(Number(rawMax)) ? Number(rawMax) : 12,
    1,
    48,
  );
  const sceneThreshold = clamp(
    Number.isFinite(Number(rawSceneThresh)) ? Number(rawSceneThresh) : 0.35,
    0.12,
    0.85,
  );
  const minSceneGapSec = clamp(
    Number.isFinite(Number(rawGap)) ? Number(rawGap) : 0.4,
    0.15,
    3,
  );

  const strategy =
    String(extractionStrategy).trim().toUpperCase() === "SCENE_CUT"
      ? "SCENE_CUT"
      : "UNIFORM";

  const objectKey = normalizeSourceVideoObjectKey(
    sourceVideoS3Key,
    assetsBucketName,
  );
  const logPhase = (phase, detail) => {
    console.error(
      JSON.stringify({
        fargateSourceVideoExtract: true,
        phase,
        jobId,
        ...detail,
        at: new Date().toISOString(),
      }),
    );
  };
  logPhase("normalized_key", {
    objectKey,
    rawKeyLength: String(sourceVideoS3Key).length,
  });
  const workDir = await fs.mkdtemp(path.join(tmpdir(), `svf-${jobId}-`));
  try {
    const ext = inferVideoFileExtension(objectKey);
    const localVideo = path.join(workDir, `source${ext}`);
    await storageRepo.downloadObject(objectKey, localVideo);
    const st = await fs.stat(localVideo);
    if (!st.isFile() || st.size < 1) {
      throw new Error(
        `downloaded source video is missing or empty at ${localVideo} (S3 key: ${objectKey})`,
      );
    }
    logPhase("downloaded", {
      localVideo,
      bytes: st.size,
      strategy,
    });

    const common = {
      jobId,
      sourceVideoS3Key: objectKey,
      storageRepo,
      mediaToolsRepo,
      localVideo,
      workDir,
      sampleIntervalSec,
      maxFrames,
    };

    if (strategy === "SCENE_CUT") {
      // `return await` 필수: await 없이 Promise만 반환하면 `finally`가 ffmpeg 끝나기 전에
      // workDir를 지워 source.mp4 가 사라진다.
      return await extractSceneCutFrames({
        ...common,
        sceneThreshold,
        minSceneGapSec,
        getMediaDurationSec: mediaToolsRepo.getMediaDurationSec,
      });
    }

    return await extractUniformFrames(common);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
