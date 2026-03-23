import { stepTitle, type LlmStepSettings } from '@/entities/llm-step';
import {
  SettingsSectionCard,
  SettingsSectionIntro,
  SettingsStatCard,
} from './settings-section-primitives';
import { type ChannelSummary } from '../model';

type GeneralSectionProps = {
  items: LlmStepSettings[];
  channelSummary: ChannelSummary;
};

export function GeneralSection({ items, channelSummary }: GeneralSectionProps) {
  const stepLabels = items.map((item) => stepTitle(item.stepKey)).join(', ');

  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="개요"
        title="운영 기본값과 연결 상태"
        description="설정 화면은 전역 정책과 기본 연결을 관리하는 콘솔입니다. 실시간 운영 상황과 병목 추적은 대시보드와 채널 화면에 남기고, 여기서는 기본값과 커버리지 상태를 안정적으로 유지합니다."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettingsStatCard
          label="등록 채널"
          value={channelSummary.total}
          hint="카탈로그에 등록된 운영 채널 수"
        />
        <SettingsStatCard
          label="자동 게시"
          value={channelSummary.autoPublish}
          hint="렌더 후 자동 게시가 켜진 채널"
        />
        <SettingsStatCard
          label="모델 단계"
          value={items.length}
          hint="공통 모델 기본값이 있는 단계"
        />
        <SettingsStatCard
          label="유튜브 연결"
          value={channelSummary.dbSource}
          hint="유튜브 설정이 저장된 채널"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsSectionCard
          title="운영 원칙"
          description="어떤 설정을 이 화면에서 관리하고, 어떤 운영 상태를 다른 화면에서 보는지 역할을 고정합니다."
        >
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>
              대시보드는 통합 관제판이고, 실제 조작은 채널 메뉴와 제작 아이템 화면에서 수행합니다.
            </p>
            <p>설정은 채널 연결, 글로벌 모델 기본값, publish 정책, 런타임 원칙을 다룹니다.</p>
            <p>운영 상태와 병목 정보는 설정 화면에 끌어오지 않고 각 작업 화면에 남겨둡니다.</p>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          title="기본값 커버리지"
          description="현재 전역 기본값이 어느 정도 채워져 있는지 한 번에 확인합니다."
          tone="section"
        >
          <div className="space-y-3 text-sm leading-6 text-admin-text-muted">
            <p>플레이리스트 설정 채널: {channelSummary.withPlaylist}</p>
            <p>채널 카탈로그 항목 수: {channelSummary.total}</p>
            <p>프롬프트·모델 단계: {stepLabels || '-'}</p>
          </div>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
