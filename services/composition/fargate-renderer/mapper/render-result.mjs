export function createRenderTaskResult({
  jobId,
  renderId,
  renderedAt,
  debugMp4BundlePrefix,
}) {
  return {
    finalVideoS3Key: `rendered/${jobId}/history/${renderId}/final.mp4`,
    previewS3Key: `previews/${jobId}/history/${renderId}/preview.mp4`,
    thumbnailS3Key: `rendered/${jobId}/history/${renderId}/thumbnail.jpg`,
    provider: "fargate-ffmpeg",
    artifactsStored: true,
    renderedAt,
    ...(typeof debugMp4BundlePrefix === "string" && debugMp4BundlePrefix
      ? { debugMp4BundlePrefix }
      : {}),
  };
}

export function createVoicePostprocessResult({
  outputAudioS3Key,
  durationSec,
  adjustedAt,
  tempoApplied,
}) {
  return {
    voiceS3Key: outputAudioS3Key,
    durationSec,
    provider: "fargate-ffmpeg-atempo",
    adjustedAt,
    tempoApplied,
  };
}

export function createRenderFailureResult({
  message,
  renderedAt,
  provider = "fargate-ffmpeg",
  debug,
}) {
  return {
    provider,
    failed: true,
    message,
    renderedAt,
    ...(debug && typeof debug === "object" ? { debug } : {}),
  };
}
