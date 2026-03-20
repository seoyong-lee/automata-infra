"use client";

import { logout } from "@packages/auth";
import { cn } from "@packages/ui";
import { Button } from "@packages/ui/button";
import { Settings, Cog, LayoutDashboard, FilePlay, Route } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

type NavSection = {
  title: string;
  items: Array<{
    title: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
  }>;
};

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      { title: "콘텐츠 관리", href: "/jobs", icon: FilePlay },
      { title: "작업 관리", href: "/reviews", icon: Route },
    ],
  },
  {
    title: "Global",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  return (
    <main className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-full w-full flex-col">
          <div className="border-b px-4 py-4">
            <Link href="/" className="flex items-center gap-3 rounded-md p-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Cog className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Automata Studio
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Admin Console
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-6 px-3 py-4">
            {navSections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="px-2 text-xs font-medium text-muted-foreground">
                  {section.title}
                </h2>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>

          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
          <div className="flex items-center justify-between border-b pb-4 lg:hidden">
            <nav className="flex items-center gap-3 text-sm font-medium">
              <Link href="/" className="text-foreground hover:text-primary">
                Dashboard
              </Link>
              <Link
                href="/jobs"
                className="text-muted-foreground hover:text-primary"
              >
                Content
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-primary"
              >
                Settings
              </Link>
            </nav>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
