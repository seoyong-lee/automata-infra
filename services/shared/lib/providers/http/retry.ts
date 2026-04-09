type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Override default retry rules (e.g. OpenAI quota errors on 429). */
  shouldRetry?: (input: { status: number; bodyText: string }) => boolean;
};

type PollOptions<T> = {
  fetcher: () => Promise<T>;
  isDone: (payload: T) => boolean;
  isFailed?: (payload: T) => boolean;
  getStatus?: (payload: T) => string;
  intervalMs?: number;
  timeoutMs?: number;
};

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const defaultShouldRetry = (status: number, bodyText: string): boolean => {
  if (!RETRYABLE_STATUS.has(status)) {
    return false;
  }
  if (status === 429 && /insufficient_quota/i.test(bodyText)) {
    return false;
  }
  return true;
};

const shouldRetryHttpError = (
  options: RetryOptions,
  status: number,
  bodyText: string,
): boolean =>
  options.shouldRetry
    ? options.shouldRetry({ status, bodyText })
    : defaultShouldRetry(status, bodyText);

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const computeBackoffDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number => {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.floor(expDelay / 3 + 1));
  return expDelay + jitter;
};

export const fetchWithRetry = async (
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> => {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await sleep(computeBackoffDelay(attempt, baseDelayMs, maxDelayMs));
      continue;
    }

    if (response.ok) {
      return response;
    }

    const bodyText = await response.text();
    const shouldRetryError = shouldRetryHttpError(
      options,
      response.status,
      bodyText,
    );

    if (!shouldRetryError || attempt === maxAttempts) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${bodyText.slice(0, 300)}`,
      );
    }

    await sleep(computeBackoffDelay(attempt, baseDelayMs, maxDelayMs));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("HTTP request failed after retries");
};

export const fetchJsonWithRetry = async <T>(
  url: string,
  init: RequestInit,
  options?: RetryOptions,
): Promise<T> => {
  const response = await fetchWithRetry(url, init, options);
  return (await response.json()) as T;
};

export const fetchArrayBufferWithRetry = async (
  url: string,
  init: RequestInit,
  options?: RetryOptions,
): Promise<ArrayBuffer> => {
  const response = await fetchWithRetry(url, init, options);
  return response.arrayBuffer();
};

export const pollUntil = async <T>(options: PollOptions<T>): Promise<T> => {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30000;
  const intervalMs = options.intervalMs ?? 3000;

  while (Date.now() - startedAt <= timeoutMs) {
    const payload = await options.fetcher();

    if (options.isDone(payload)) {
      return payload;
    }

    if (options.isFailed?.(payload)) {
      const status = options.getStatus?.(payload) ?? "failed";
      throw new Error(`Polling failed with status: ${status}`);
    }

    await sleep(intervalMs);
  }

  throw new Error("Polling timed out");
};
