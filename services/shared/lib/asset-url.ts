const getPreviewDistributionDomain = (): string | undefined => {
  const domain =
    process.env.PREVIEW_DISTRIBUTION_DOMAIN ??
    process.env.NEXT_PUBLIC_PREVIEW_DISTRIBUTION_DOMAIN;
  const normalized = domain?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.replace(/^https?:\/\//, "").replace(/\/+$/, "");
};

export const buildPreviewAssetUrl = (s3Key?: string): string | undefined => {
  const key = s3Key?.trim();
  const domain = getPreviewDistributionDomain();
  if (!key || !domain) {
    return undefined;
  }
  return `https://${domain}/${key.replace(/^\/+/, "")}`;
};
