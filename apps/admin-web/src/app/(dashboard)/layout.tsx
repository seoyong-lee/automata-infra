"use client";

import Link from "next/link";
import { logout } from "@packages/auth";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <header
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="stack">
          <Link href="/">Overview</Link>
          <Link href="/reviews">Reviews</Link>
        </div>
        <button className="btn secondary" onClick={() => logout()}>
          Logout
        </button>
      </header>
      <section style={{ marginTop: 16 }}>{children}</section>
    </main>
  );
}
