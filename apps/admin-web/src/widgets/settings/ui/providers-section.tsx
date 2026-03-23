import { stepTitle, type LlmStepSettings } from '@/entities/llm-step';
import {
  SettingsSectionCard,
  SettingsSectionIntro,
  SettingsStatCard,
} from './settings-section-primitives';

type ProvidersSectionProps = {
  items: LlmStepSettings[];
};

export function ProvidersSection({ items }: ProvidersSectionProps) {
  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="프로바이더"
        title="외부 모델 연결 책임과 장애 대응"
        description="API key와 실제 비밀값은 시크릿 저장소에 두고, 설정 화면에는 식별자와 운영 정책만 노출합니다. 런타임 장애 감지는 대시보드와 채널 화면에서 하고, 이 섹션은 기본 연결 원칙을 고정합니다."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="관리 단계"
          value={items.length}
          hint="provider 기본값이 연결된 단계 수"
        />
        <SettingsStatCard
          label="시크릿 위치"
          value="외부 저장소"
          hint="비밀값은 설정 화면이 아니라 시크릿 저장소에 보관"
        />
        <SettingsStatCard
          label="장애 확인"
          value="운영 화면"
          hint="장애 징후는 대시보드와 채널 운영 화면에서 확인"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingsSectionCard title="연결 책임">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>외부 provider API key 자체는 시크릿 저장소에 보관하고 식별자만 설정에 남깁니다.</p>
            <p>
              실제 런타임 장애는 운영 화면에서 감지하고, 기본 연결 정책만 이 영역에서 유지합니다.
            </p>
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="현재 모델 연결" tone="section">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            {items.length === 0 ? (
              <p>등록된 provider step이 아직 없습니다.</p>
            ) : (
              items.map((item) => (
                <p key={item.stepKey}>
                  {stepTitle(item.stepKey)}: {item.provider} / {item.model}
                </p>
              ))
            )}
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="기본 복귀 원칙">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>
              provider 변경은 가능한 한 동일 계약을 유지한 채 step settings만 바꾸는 방향으로
              다룹니다.
            </p>
            <p>서비스 코드는 renderer/provider 세부를 UI 상위 흐름에 새지 않게 유지합니다.</p>
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
