const fail = (message: string): never => {
  throw new Error(message);
};

export const expectRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
};

export const expectString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fail(`${label} must be a non-empty string`);
  }

  return value.trim();
};

export const expectNullableString = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    return fail(`${label} must be a string`);
  }

  return value.trim();
};

export const expectOptionalString = (
  value: unknown,
  label: string,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return expectString(value, label);
};

export const expectOptionalBoolean = (
  value: unknown,
  label: string,
): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    return fail(`${label} must be a boolean`);
  }
  return value;
};

export const expectNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fail(`${label} must be a valid number`);
  }

  return value;
};

/** LLM JSON often returns numeric fields as strings; accept finite numbers and numeric strings. */
export const expectNumberCoerced = (value: unknown, label: string): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (Number.isFinite(n)) {
      return n;
    }
  }

  return fail(`${label} must be a valid number`);
};

export const expectArray = <T>(
  value: unknown,
  label: string,
  mapItem: (entry: unknown, index: number) => T,
): T[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(`${label} must be a non-empty array`);
  }

  return value.map((entry, index) => mapItem(entry, index));
};
