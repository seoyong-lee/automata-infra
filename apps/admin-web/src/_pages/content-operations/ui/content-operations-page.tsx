'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Suspense } from 'react';

import { ChannelSelectorTabs } from '@/widgets/channel-selector-tabs';
import {
  ContentLinesSection,
  SelectedChannelSection,
  useContentOperationsWorkspaceState,
} from '@/widgets/content-operations';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { ContentOperationsJobListBlock } from './content-operations-job-list-block';

function ContentOperationsPageContent() {
  const {
    availableChannels,
    contentCards,
    contentTypes,
    filteredJobs,
    isUploading,
    jobsQuery,
    onUpload,
    selectedChannel,
    selectedChannelConfig,
    selectedContentType,
    setSelectedChannelId,
    setSelectedContentType,
  } = useContentOperationsWorkspaceState();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="콘텐츠 리스트"
        subtitle="채널·라인을 고른 뒤 목록에서 항목을 열어 단계별 작업 화면으로 이동합니다. 상태·큐별 보기는 「작업 현황」을 사용합니다."
      />

      <Card>
        <CardContent className="space-y-8 px-4 py-8 sm:px-6 md:px-8">
          <ChannelSelectorTabs
            availableChannels={availableChannels}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannelId}
            isLoading={jobsQuery.isLoading}
          />

          <div className="grid gap-8 border-t border-border/70 pt-8 md:grid-cols-2">
            <SelectedChannelSection
              selectedChannel={selectedChannel}
              selectedChannelConfig={selectedChannelConfig}
            />
            <ContentLinesSection
              contentTypes={contentTypes}
              contentCards={contentCards}
              selectedContentType={selectedContentType}
              onSelectContentType={setSelectedContentType}
            />
          </div>

          <ContentOperationsJobListBlock
            filteredJobs={filteredJobs}
            isLoading={jobsQuery.isLoading}
            isUploading={isUploading}
            onUpload={onUpload}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ContentOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader
            title="콘텐츠 리스트"
            subtitle="채널과 콘텐츠 목록을 불러오는 중입니다..."
          />
          <Card>
            <CardHeader>
              <CardTitle>불러오는 중</CardTitle>
              <CardDescription>잠시만 기다려 주세요.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ContentOperationsPageContent />
    </Suspense>
  );
}
