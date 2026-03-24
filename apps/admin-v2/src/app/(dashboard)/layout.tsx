"use client";

import type { ReactNode } from "react";

import { AdminV2AppShell } from "@/widgets/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AdminV2AppShell>{children}</AdminV2AppShell>;
}
