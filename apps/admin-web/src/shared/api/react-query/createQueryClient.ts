import { QueryCache, QueryClient } from "@tanstack/react-query";

export const createQueryClient = (onError?: (error: Error) => void) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1,
      },
    },
    queryCache: new QueryCache({
      onError: (error: unknown) => {
        onError?.(error as Error);
      },
    }),
  });
};
