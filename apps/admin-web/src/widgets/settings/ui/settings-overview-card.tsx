import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

export function SettingsOverviewCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>설정은 현재 채널·제작 아이템 작업 맥락과 분리된 글로벌 관리 영역입니다.</p>
        <p>채널 연결, 모델/프롬프트, publish 기본값, 런타임 원칙을 이곳에서 관리합니다.</p>
        <p>값이 저장되지 않은 단계는 코드 기본값을 fallback으로 사용합니다.</p>
      </CardContent>
    </Card>
  );
}
