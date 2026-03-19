"use client";

import { ThemeProvider } from "@packages/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { getErrorMessage } from "@packages/utils";
import type { ReactNode } from "react";
import { createQueryClient } from "@/shared/api/react-query/createQueryClient";
import { initClientApp } from "./initClientApp";
import { useAuthRedirect } from "./useAuthRedirect";

initClientApp();

export const Providers = ({ children }: { children: ReactNode }) => {
  const queryClient = useMemo(
    () =>
      createQueryClient((error) => {
        console.error(getErrorMessage(error));
      }),
    [],
  );
  useAuthRedirect();

  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};
