export const buildUploadApiResponse = (
  statusCode: number,
  body: Record<string, unknown>,
) => {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
};
