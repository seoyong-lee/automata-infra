import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { StepSettingsCard } from '@/features/step-settings';
import { type LlmStepSettings } from '@/entities/llm-step';

type ModelsSectionProps = {
  items: LlmStepSettings[];
};

export function ModelsSection({ items }: ModelsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Models & Prompts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>단계별 모델, temperature, prompt version, prompt 본문을 관리합니다.</p>
          <p>
            계약은 shared schema를 기준으로 유지하고, 저장값이 없으면 코드 fallback을 사용합니다.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {items.map((settings) => (
          <StepSettingsCard key={settings.stepKey} settings={settings} />
        ))}
      </div>
    </>
  );
}
