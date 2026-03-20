import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { stepTitle, type LlmStepSettings } from '@/entities/llm-step';

type ProvidersSectionProps = {
  items: LlmStepSettings[];
};

export function ProvidersSection({ items }: ProvidersSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Provider Ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            외부 provider API key 자체는 시크릿 저장소에 보관하고, 설정 화면에는 식별자와 운영
            정책만 노출합니다.
          </p>
          <p>
            실제 런타임 장애는 대시보드와 콘텐츠 관리에서 감지하고, 기본 연결 정책만 이 영역에서
            유지합니다.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current LLM Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {items.length === 0 ? (
            <p>등록된 provider step이 아직 없습니다.</p>
          ) : (
            items.map((item) => (
              <p key={item.stepKey}>
                {stepTitle(item.stepKey)}: {item.provider} / {item.model}
              </p>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fallback Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            provider 변경은 가능한 한 동일 계약을 유지한 채 step settings만 바꾸는 방향으로
            다룹니다.
          </p>
          <p>서비스 코드는 renderer/provider 세부를 UI 상위 흐름에 새지 않게 유지합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
