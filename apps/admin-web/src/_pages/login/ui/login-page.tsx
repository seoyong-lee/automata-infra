"use client";

import { startLogin } from "@packages/auth";
import { Button } from "@packages/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LoginContent = () => {
  const sp = useSearchParams();
  const error = sp.get("error");
  const next = sp.get("next") ?? "/";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Google 로그인으로 어드민 대시보드에 접근합니다.
          </p>
          {error ? (
            <p className="text-sm text-destructive">로그인 오류: {error}</p>
          ) : null}
          <Button
            onClick={() =>
              startLogin({
                next,
                identityProvider: "Google",
              })
            }
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
