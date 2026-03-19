type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
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

const responseError = async (response: Response): Promise<Error> => {
  const bodySnippet = (await response.text()).slice(0, 300);
  return new Error(
    `HTTP ${response.status} ${response.statusText}: ${bodySnippet}`,
  );
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
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
        throw await responseError(response);
      }
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
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
