"use client";

import { startLogin } from "@packages/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LoginContent = () => {
  const sp = useSearchParams();
  const error = sp.get("error");
  const next = sp.get("next") ?? "/";

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 480, margin: "64px auto" }}>
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p>Cognito 로그인으로 어드민 대시보드에 접근합니다.</p>
        {error ? (
          <p style={{ color: "#dc2626" }}>로그인 오류: {error}</p>
        ) : null}
        <button className="btn" onClick={() => startLogin({ next })}>
          Sign in with Cognito
        </button>
      </div>
    </main>
  );
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
