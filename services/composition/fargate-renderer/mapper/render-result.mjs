export function createRenderTaskResult({ jobId, renderId, renderedAt }) {
  return {
    finalVideoS3Key: `rendered/${jobId}/history/${renderId}/final.mp4`,
    previewS3Key: `previews/${jobId}/history/${renderId}/preview.mp4`,
    thumbnailS3Key: `rendered/${jobId}/history/${renderId}/thumbnail.jpg`,
    provider: "fargate-ffmpeg",
    artifactsStored: true,
    renderedAt,
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

export function createRenderFailureResult({ message, renderedAt }) {
  return {
    provider: "fargate-ffmpeg",
    failed: true,
    message,
    renderedAt,
  };
}
