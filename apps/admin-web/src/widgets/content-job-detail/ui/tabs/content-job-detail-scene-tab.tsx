'use client';

import { useJobExecutionsQuery } from '@packages/graphql';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { ContentJobDetailSceneBuildPanel } from '@/features/content-job-detail';

import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';
import { ContentJobDetailScriptWorkspaceTabs } from './content-job-detail-script-workspace-tabs';

type Props = {
  jobId: string;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailSceneTab({ jobId, pageData }: Props) {
  const { detailVm } = pageData;
  const executionsQuery = useJobExecutionsQuery({ jobId }, { enabled: Boolean(jobId) });
  const sceneExecutions = executionsQuery.data?.filter((execution) => execution.stageType === 'SCENE_JSON') ?? [];
  const byRecent = (a: (typeof sceneExecutions)[number], b: (typeof sceneExecutions)[number]) =>
    new Date(b.completedAt ?? b.startedAt).getTime() -
    new Date(a.completedAt ?? a.startedAt).getTime();
  const latestFailed = [...sceneExecutions]
    .filter((execution) => execution.status === 'FAILED')
    .sort(byRecent)[0];
  const latestSucceeded = [...sceneExecutions]
    .filter((execution) => execution.status === 'SUCCEEDED')
    .sort(byRecent)[0];
  const collapseFailure =
    Boolean(latestFailed && latestSucceeded) &&
    new Date(latestSucceeded.completedAt ?? latestSucceeded.startedAt).getTime() >
      new Date(latestFailed.completedAt ?? latestFailed.startedAt).getTime();

  return (
    <div className="space-y-6">
      <ContentJobDetailScriptWorkspaceTabs jobId={jobId} activeTab="scene" />
      {latestFailed?.errorMessage ? (
        <details
          open={!collapseFailure}
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <summary className="cursor-pointer list-none text-sm font-medium text-destructive">
            최근 씬 생성 실패 이유
            {collapseFailure ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                마지막 성공 이후 접힘
              </span>
            ) : null}
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-destructive/90">{latestFailed.errorMessage}</p>
            <p className="text-xs text-muted-foreground">
              자세한 실행 기록은 `실행 이력` 탭에서 확인할 수 있습니다.
            </p>
          </div>
        </details>
      ) : null}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">씬 설계 진입</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          토픽 시드를 조정하려면 `아이디어`, Scene JSON 결과를 직접 보정하려면 아래 `씬 설계`
          패널을 사용하세요.
        </CardContent>
      </Card>
      <ContentJobDetailSceneBuildPanel
        key={detailVm.sceneJsonKey}
        initialValue={detailVm.sceneJsonInitialValue}
        runError={pageData.runSceneJsonError}
        saveError={pageData.updateSceneJsonError}
        isRunning={pageData.isRunningSceneJson}
        isSaving={pageData.isSavingSceneJson}
        onRun={pageData.runSceneJson}
        onSave={pageData.saveSceneJson}
      />
      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="SCENE_JSON"
        approvedExecutionId={pageData.detail?.job.approvedSceneExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />
    </div>
  );
}
