export const runWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  if (items.length === 0) {
    return;
  }
  const runnerCount = Math.max(
    1,
    Math.min(items.length, Math.floor(concurrency)),
  );
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: runnerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        if (item !== undefined) {
          await worker(item);
        }
      }
    }),
  );
};
