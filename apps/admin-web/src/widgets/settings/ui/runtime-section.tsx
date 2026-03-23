import {
  SettingsSectionCard,
  SettingsSectionIntro,
  SettingsStatCard,
} from './settings-section-primitives';

export function RuntimeSection() {
  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="런타임"
        title="재시도와 fallback 운영 원칙"
        description="런타임 섹션은 실제 장애 대시보드가 아니라 기본 동작 원칙을 문서화하는 곳입니다. 재실행 우선순위, fallback 기준, 향후 제어값 확장 방향을 전역 관점에서 정리합니다."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="재시도 전략"
          value="부분 재실행"
          hint="전체 재실행보다 scene/TTS/visual 단위 재실행 우선"
        />
        <SettingsStatCard
          label="기본 복귀"
          value="코드"
          hint="값이 비어 있으면 코드 기본값 또는 환경 변수로 복귀"
        />
        <SettingsStatCard
          label="제어 확장"
          value="후속 예정"
          hint="재시도 정책과 failover 제어값은 후속 확장 예정"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingsSectionCard title="런타임 원칙">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>Asset first, composition second 원칙을 유지합니다.</p>
            <p>실패 시 전체 재실행보다 특정 scene/TTS/visual 재실행을 우선합니다.</p>
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="기본 복귀 동작" tone="section">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>값이 비어 있으면 코드 기본값 또는 환경 변수 fallback을 사용합니다.</p>
            <p>
              운영자가 자주 보는 상태는 대시보드/채널에 남기고, 런타임 정책만 여기서 문서화합니다.
            </p>
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="후속 제어 항목">
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>
              재시도 정책, 기능 토글, provider failover 같은 제어값은 이후 이 섹션으로 확장합니다.
            </p>
            <p>현재는 channel/model 설정이 실제 운영의 우선순위입니다.</p>
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
