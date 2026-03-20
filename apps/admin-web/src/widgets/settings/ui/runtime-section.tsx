import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";

export function RuntimeSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Runtime Principles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Asset first, composition second 원칙을 유지합니다.</p>
          <p>
            실패 시 전체 재실행보다 특정 scene/TTS/visual 재실행을 우선합니다.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fallback Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            값이 비어 있으면 코드 기본값 또는 환경 변수 fallback을 사용합니다.
          </p>
          <p>
            운영자가 자주 보는 상태는 대시보드/콘텐츠 관리에 남기고, 런타임
            정책만 여기서 문서화합니다.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Next Runtime Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            재시도 정책, 기능 토글, provider failover 같은 제어값은 이후 이
            섹션으로 확장합니다.
          </p>
          <p>현재는 channel/model 설정이 실제 운영의 우선순위입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
