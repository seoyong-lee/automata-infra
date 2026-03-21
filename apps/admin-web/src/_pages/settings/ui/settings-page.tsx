'use client';

import { useState } from 'react';

import {
  getChannelSummary,
  SettingsQueryStatus,
  SettingsSectionContent,
  SettingsSectionTabsCard,
  type SettingsSection,
} from '@/widgets/settings';
import { useAdminContents } from '@/entities/admin-content';
import { useLlmSettings } from '@/entities/llm-step';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function SettingsPage() {
  const settingsQuery = useLlmSettings();
  const contentsQuery = useAdminContents({ limit: 100 });
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const items = settingsQuery.data ?? [];
  const contents = contentsQuery.data?.items ?? [];
  const channelSummary = getChannelSummary(contents);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="설정"
        subtitle="채널·제작 아이템 작업과 분리된 글로벌 영역입니다. 채널 연결, 모델·프롬프트, publish 기본값, 런타임 원칙을 관리합니다. 저장되지 않은 항목은 코드 기본값으로 동작합니다."
      />
      <SettingsSectionTabsCard activeSection={activeSection} onSectionChange={setActiveSection} />
      <SettingsQueryStatus
        settingsLoading={settingsQuery.isLoading}
        settingsError={settingsQuery.error}
        contentsLoading={contentsQuery.isLoading}
        contentsError={contentsQuery.error}
      />
      <SettingsSectionContent
        activeSection={activeSection}
        items={items}
        contents={contents}
        channelSummary={channelSummary}
      />
    </div>
  );
}
