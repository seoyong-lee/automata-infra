export const parseUploadBody = (body: string | null) => {
  const payload = body ? (JSON.parse(body) as Record<string, unknown>) : {};
  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;

  return {
    jobId,
  };
};
