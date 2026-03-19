import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";

export default function PendingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>권한 대기</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          현재 계정은 Admin 그룹 권한이 없습니다. 관리자에게 그룹 할당을
          요청하세요.
        </CardContent>
      </Card>
    </main>
  );
}
