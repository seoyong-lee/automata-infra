export const withStringFallback = (value: string | null | undefined, fallback = ''): string => {
  return value ?? fallback;
};

export const withBooleanFallback = (
  value: boolean | null | undefined,
  fallback = false,
): boolean => {
  return value ?? fallback;
};

export const toNumberFieldValue = (value: number | null | undefined, fallback = ''): string => {
  return value == null ? fallback : String(value);
};
