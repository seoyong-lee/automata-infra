"use client";

import {
  consumeLoginNext,
  exchangeTokens,
  isAdmin,
  saveTokens,
} from "@packages/auth";
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
    <main className="container">
      <div className="card" style={{ maxWidth: 480, margin: "64px auto" }}>
        <p>Authenticating...</p>
      </div>
    </main>
  );
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
