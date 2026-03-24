"use client";

import { ThemeProvider } from "@packages/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { createQueryClient } from "@/shared/api/react-query/createQueryClient";

export const Providers = ({ children }: { children: ReactNode }) => {
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};
