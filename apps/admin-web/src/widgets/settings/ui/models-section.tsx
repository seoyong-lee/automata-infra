import { StepSettingsCard } from '@/features/step-settings';
import { type LlmStepSettings } from '@/entities/llm-step';
import { SettingsSectionIntro, SettingsStatCard } from './settings-section-primitives';

type ModelsSectionProps = {
  items: LlmStepSettings[];
};

export function ModelsSection({ items }: ModelsSectionProps) {
  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="모델"
        title="단계별 생성 계약 기본값"
        description="LLM 단계별 provider, model, temperature, prompt 버전을 관리합니다. 저장값이 비어 있으면 코드 fallback을 사용하고, 계약 자체는 shared schema를 기준으로 유지합니다."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="관리 단계"
          value={items.length}
          hint="글로벌 모델 기본값이 있는 단계 수"
        />
        <SettingsStatCard
          label="운영 목표"
          value="일관성"
          hint="단계별 출력 형식과 프롬프트 버전 일관성 유지"
        />
        <SettingsStatCard
          label="기본 복귀"
          value="코드"
          hint="저장값이 없을 때 코드 기본값으로 복귀"
        />
      </div>

      <div className="grid gap-4">
        {items.map((settings) => (
          <StepSettingsCard key={settings.stepKey} settings={settings} />
        ))}
      </div>
    </div>
  );
}
