export async function uploadFileToPresignedUrl(input: {
  file: File;
  uploadUrl: string;
  contentType?: string;
}): Promise<void> {
  const response = await fetch(input.uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': input.contentType || input.file.type || 'application/octet-stream',
    },
    body: input.file,
  });

  if (!response.ok) {
    throw new Error(`파일 업로드 실패 (${response.status})`);
  }
}
