"use client";

import {
  consumeLoginNext,
  exchangeTokens,
  isAdmin,
  saveTokens,
} from "@packages/auth";
import { Card, CardContent } from "@packages/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";

const AuthCallbackContent = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const ranRef = useRef(false);

  const code = useMemo(() => sp.get("code"), [sp]);
  const error = useMemo(() => sp.get("error"), [sp]);
  const next = useMemo(() => consumeLoginNext() ?? "/", []);

  useEffect(() => {
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!code || ranRef.current) {
      return;
    }
    ranRef.current = true;

    void (async () => {
      try {
        const tokens = await exchangeTokens(code);
        saveTokens({
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType ?? "Bearer",
          expiresIn: tokens.expiresIn,
        });

        const admin = await isAdmin();
        router.replace(admin ? next : "/pending");
      } catch (e) {
        console.error(e);
        router.replace("/login?error=exchange_failed");
      }
    })();
  }, [code, error, next, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
