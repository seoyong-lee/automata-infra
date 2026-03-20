'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Suspense, useState } from 'react';
import { ChannelSelectorTabs } from '@/widgets/channel-selector-tabs';
import {
  ContentJobsSection,
  ContentLineOverviewSection,
  ContentOperationsSectionTabs,
  ContentLinesSection,
  OptionLabSection,
  SelectedChannelSection,
  SelectedJobPanelSection,
  type ContentOperationsSectionKey,
  useContentOperationsExperimentsTab,
  useContentOperationsJobsTab,
  useContentOperationsQueueTab,
  useContentOperationsScopeTab,
  useContentOperationsWorkspaceState,
  VariantComparisonSection,
} from '@/widgets/content-operations';

type ContentOperationsSectionContentProps = {
  activeSection: ContentOperationsSectionKey;
  contentTypes: string[];
  filteredJobs: ReturnType<typeof useContentOperationsWorkspaceState>['filteredJobs'];
  isLoading: boolean;
  isUploading: boolean;
  jobsTab: ReturnType<typeof useContentOperationsJobsTab>;
  onSelectContentType: (contentType: string) => void;
  onSelectJob: (jobId: string) => void;
  onSelectQuickFilter: ReturnType<
    typeof useContentOperationsWorkspaceState
  >['setSelectedQuickFilter'];
  onUpload: (jobId: string) => void;
  queueTab: ReturnType<typeof useContentOperationsQueueTab>;
  scopeTab: ReturnType<typeof useContentOperationsScopeTab>;
  selectedContentType: string;
  selectedJob: ReturnType<typeof useContentOperationsWorkspaceState>['selectedJob'];
  selectedQuickFilter: ReturnType<typeof useContentOperationsWorkspaceState>['selectedQuickFilter'];
  experimentsTab: ReturnType<typeof useContentOperationsExperimentsTab>;
};

function ContentOperationsSectionContent({
  activeSection,
  contentTypes,
  experimentsTab,
  filteredJobs,
  isLoading,
  isUploading,
  jobsTab,
  onSelectContentType,
  onSelectJob,
  onSelectQuickFilter,
  onUpload,
  queueTab,
  scopeTab,
  selectedContentType,
  selectedJob,
  selectedQuickFilter,
}: ContentOperationsSectionContentProps) {
  if (activeSection === 'scope') {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SelectedChannelSection
          selectedChannel={scopeTab.selectedChannel}
          selectedChannelConfig={scopeTab.selectedChannelConfig}
        />
        <ContentLinesSection
          contentTypes={contentTypes}
          contentCards={scopeTab.contentCards}
          selectedContentType={selectedContentType}
          onSelectContentType={onSelectContentType}
        />
      </div>
    );
  }

  if (activeSection === 'queue') {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <ContentLineOverviewSection
          contentLineSummary={queueTab.contentLineSummary}
          quickFilterCounts={queueTab.quickFilterCounts}
          selectedQuickFilter={selectedQuickFilter}
          onSelectQuickFilter={onSelectQuickFilter}
        />
        <SelectedJobPanelSection
          selectedJob={selectedJob}
          isUploading={isUploading}
          onUpload={onUpload}
        />
      </div>
    );
  }

  if (activeSection === 'experiments') {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <OptionLabSection experimentTracks={experimentsTab.experimentTracks} />
        <VariantComparisonSection compareCandidates={experimentsTab.compareCandidates} />
      </div>
    );
  }

  return (
    <ContentJobsSection
      filteredJobs={filteredJobs}
      isLoading={isLoading}
      selectedJobId={jobsTab.selectedJobId}
      onSelectJob={onSelectJob}
      isUploading={isUploading}
      onUpload={onUpload}
    />
  );
}

function ContentOperationsPageContent() {
  const [activeSection, setActiveSection] = useState<ContentOperationsSectionKey>('scope');
  const {
    availableChannels,
    channelJobs,
    contentLineJobs,
    contentTypes,
    filteredJobs,
    isUploading,
    jobsQuery,
    onUpload,
    selectedChannel,
    selectedChannelConfig,
    selectedContentType,
    selectedJob,
    selectedJobId,
    selectedQuickFilter,
    setSelectedChannelId,
    setSelectedContentType,
    setSelectedJobId,
    setSelectedQuickFilter,
  } = useContentOperationsWorkspaceState();
  const scopeTab = useContentOperationsScopeTab({
    channelJobs,
    contentTypes,
    selectedChannel,
    selectedChannelConfig,
  });
  const queueTab = useContentOperationsQueueTab({
    contentLineJobs,
    selectedContentType,
  });
  const experimentsTab = useContentOperationsExperimentsTab({ filteredJobs });
  const jobsTab = useContentOperationsJobsTab({
    filteredJobsCount: filteredJobs.length,
    selectedJobId,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ChannelSelectorTabs
          availableChannels={availableChannels}
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannelId}
          isLoading={jobsQuery.isLoading}
        />
      </div>

      <ContentOperationsSectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <ContentOperationsSectionContent
        activeSection={activeSection}
        contentTypes={contentTypes}
        experimentsTab={experimentsTab}
        filteredJobs={filteredJobs}
        isLoading={jobsQuery.isLoading}
        isUploading={isUploading}
        jobsTab={jobsTab}
        onSelectContentType={setSelectedContentType}
        onSelectJob={setSelectedJobId}
        onSelectQuickFilter={setSelectedQuickFilter}
        onUpload={onUpload}
        queueTab={queueTab}
        scopeTab={scopeTab}
        selectedContentType={selectedContentType}
        selectedJob={selectedJob}
        selectedQuickFilter={selectedQuickFilter}
      />
    </div>
  );
}

export function ContentOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>콘텐츠 관리</span>
                  <span>/</span>
                  <span>운영 워크스페이스</span>
                </div>
                <div className="space-y-1">
                  <CardTitle>Content Operations</CardTitle>
                  <CardDescription>Loading channel tabs and content filters...</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ContentOperationsPageContent />
    </Suspense>
  );
}
