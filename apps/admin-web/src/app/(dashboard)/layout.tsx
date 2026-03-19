"use client";

import Link from "next/link";
import { logout } from "@packages/auth";
import { Button } from "@packages/ui/button";
import { Card, CardContent } from "@packages/ui/card";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-4 md:p-6">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-foreground hover:text-primary">
              Overview
            </Link>
            <Link
              href="/reviews"
              className="text-muted-foreground hover:text-primary"
            >
              Reviews
            </Link>
          </nav>
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </CardContent>
      </Card>
      <section>{children}</section>
    </main>
  );
}
