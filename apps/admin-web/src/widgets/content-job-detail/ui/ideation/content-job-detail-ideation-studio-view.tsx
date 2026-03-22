'use client';

import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { cn } from '@packages/ui';
import Link from 'next/link';

import type { AssetsViewMode } from '../../lib/detail-workspace-tabs';
import type { AssetStage, JobDetailRouteTabKey } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsHubView } from '../assets/content-job-detail-assets-hub-view';
import { ContentJobDetailOverviewView } from '../overview/content-job-detail-overview-view';
import { ContentJobDetailRenderPreviewView } from './content-job-detail-render-preview-view';
import { ContentJobDetailIdeationTab } from '../tabs/content-job-detail-ideation-tab';
import { ContentJobDetailSceneTab } from '../tabs/content-job-detail-scene-tab';

type ContentJobDetailIdeationStudioViewProps = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  assetStage: AssetStage;
  assetsViewMode: AssetsViewMode;
  pageData: ContentJobDetailPageData;
};

const stageTabs: Array<{
  key: Exclude<JobDetailRouteTabKey, 'timeline'>;
  label: string;
  description: string;
}> = [
  { key: 'overview', label: '개요', description: '소재와 현재 상태를 빠르게 확인합니다.' },
  { key: 'ideation', label: '스크립트 입력', description: '주제와 시드를 조정합니다.' },
  { key: 'scene', label: '씬 설계', description: '씬 구조와 JSON 구성을 다듬습니다.' },
  { key: 'assets', label: '에셋 준비', description: '이미지, 음성, 영상 재료를 채웁니다.' },
  {
    key: 'publish',
    label: '렌더·미리보기',
    description: '최종 결과를 보고 수정 포인트를 찾습니다.',
  },
];

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

function buildModeHref(jobId: string, tab: Exclude<JobDetailRouteTabKey, 'timeline'>, query = '') {
  return `/jobs/${jobId}/${tab}?mode=ideation${query}`;
}

export function ContentJobDetailIdeationStudioView({
  jobId,
  activeTab,
  assetStage,
  assetsViewMode,
  pageData,
}: ContentJobDetailIdeationStudioViewProps) {
  const currentTab = activeTab === 'timeline' ? 'publish' : activeTab;
  const currentStage = stageTabs.find((stage) => stage.key === currentTab) ?? stageTabs[0];
  const sceneCount = pageData.detailVm.sceneCount;
  const readyAssetCount = pageData.detailVm.readyAssetCount;
  const status = pageData.detail?.job.status ?? 'DRAFT';
  const publishHref = '/jobs/' + jobId + '/publish?mode=workflow';
  const timelineHref = '/jobs/' + jobId + '/timeline?mode=workflow';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>단건 제작 스튜디오</CardTitle>
          <CardDescription>
            스크립트 기반 영상 한 편을 충분히 테스트하고, 미리보기와 수정 루프를 거쳐 자동화로
            올릴지 판단하는 공간입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{status}</Badge>
            <span className="text-sm text-muted-foreground">
              씬 {sceneCount || '—'}개 · 준비된 에셋 {readyAssetCount}개
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">실험 기준</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                스크립트 재현 가능성 검증
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                한 편의 결과물을 실제로 보며 포맷과 흐름이 안정적인지 먼저 확인합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">현재 루프</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                초안 → 에셋 → 렌더 → 수정
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                단계 완료보다 반복 보정이 중요하며, 검수용 운영 화면과 목적을 분리합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">자동화 승격 조건</p>
              <p className="mt-2 text-sm font-semibold text-foreground">한 편 단위 검증 완료</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                렌더 결과와 수정 포인트가 충분히 안정화되면 이후 워크플로/자동화로 확장합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {stageTabs.map((stage) => {
            const query =
              stage.key === 'assets' && assetsViewMode === 'byKind'
                ? `&view=byKind&stage=${assetStage}`
                : '';
            return (
              <Link
                key={stage.key}
                href={buildModeHref(jobId, stage.key, query)}
                className={cn(
                  tabClassName,
                  currentStage.key === stage.key
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {stage.label}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{currentStage.description}</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        {currentStage.key === 'overview' ? (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">소재와 현재 상태</h2>
              <p className="text-sm text-muted-foreground">
                무엇을 만들고 있는지 빠르게 확인하고 바로 다음 작업으로 들어갑니다.
              </p>
            </div>
            <ContentJobDetailOverviewView
              jobId={jobId}
              detail={pageData.detail}
              readyAssetCount={pageData.detailVm.readyAssetCount}
            />
          </>
        ) : null}

        {currentStage.key === 'ideation' ? (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">스크립트 입력</h2>
              <p className="text-sm text-muted-foreground">
                주제와 시드를 조정해 단건 제작 실험의 출발점을 맞춥니다.
              </p>
            </div>
            <ContentJobDetailIdeationTab jobId={jobId} pageData={pageData} />
          </>
        ) : null}

        {currentStage.key === 'scene' ? (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">씬 설계</h2>
              <p className="text-sm text-muted-foreground">
                씬 구조와 JSON 구성을 다듬어 이후 에셋과 렌더 결과를 안정화합니다.
              </p>
            </div>
            <ContentJobDetailSceneTab jobId={jobId} pageData={pageData} />
          </>
        ) : null}

        {currentStage.key === 'assets' ? (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">에셋 준비</h2>
              <p className="text-sm text-muted-foreground">
                이미지, 음성, 영상 클립을 채워 렌더 미리보기를 위한 재료를 준비합니다.
              </p>
            </div>
            <ContentJobDetailAssetsHubView
              jobId={jobId}
              assetStage={assetStage}
              assetsViewMode={assetsViewMode}
              pageData={pageData}
              mode="ideation"
            />
          </>
        ) : null}

        {currentStage.key === 'publish' ? (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">렌더·미리보기</h2>
              <p className="text-sm text-muted-foreground">
                단건 결과물을 보고 수정 포인트를 찾은 뒤 자동화 승격 여부를 판단합니다.
              </p>
            </div>
            <ContentJobDetailRenderPreviewView
              detail={pageData.detail}
              readyAssetCount={pageData.detailVm.readyAssetCount}
              workflowPublishHref={publishHref}
              workflowTimelineHref={timelineHref}
              isRunningFinalComposition={pageData.isRunningFinalComposition}
              runFinalCompositionError={pageData.runFinalCompositionError}
              onRunFinalComposition={pageData.runFinalComposition}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
