'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import { JobDraftDetail } from '../../model';
import { formatJobTimestamp } from '../../lib/format-job-timestamp';

type ContentJobDetailOverviewViewProps = {
  jobId: string;
  detail?: JobDraftDetail;
  readyAssetCount: number;
  /** 제작 아이템 상세에서만 전달. 임베드 패널에서는 생략 가능. */
  workActionResolution?: JobWorkActionResolution;
  onWorkAction?: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailOverviewView({
  jobId,
  detail,
  readyAssetCount,
  workActionResolution,
  onWorkAction,
}: ContentJobDetailOverviewViewProps) {
  const status = detail?.job.status ?? 'DRAFT';
  const totalScenes = detail?.sceneJson?.scenes?.length ?? detail?.assets.length ?? 0;
  const updatedAt = detail?.job.updatedAt ? formatJobTimestamp(detail.job.updatedAt) : '—';
  const sourceLabel = detail?.job.sourceItemId?.trim() || 'Source not linked';
  const channelLabel = detail?.job.contentId?.trim() || 'Target channel';
  const uploadId = detail?.job.uploadVideoId?.trim() || '—';
  const nextStepLabel =
    workActionResolution?.primary.label || (totalScenes > 0 ? 'Manage Scene Logic' : 'Continue');

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-4">
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Configuration Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Target Channel',
                state: detail?.job.contentId?.trim() ? 'LINKED' : 'WAITING',
                tone: detail?.job.contentId?.trim() ? 'success' : 'neutral',
              },
              {
                label: 'Source Assets',
                state: detail?.job.sourceItemId?.trim() ? 'VERIFIED' : 'WAITING',
                tone: detail?.job.sourceItemId?.trim() ? 'success' : 'neutral',
              },
              { label: 'Review Loop', state: 'PENDING', tone: 'warning' },
              { label: 'Marketing Copy', state: 'WAITING', tone: 'neutral' },
              { label: 'Deployment Queue', state: 'LOCKED', tone: 'neutral' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={
                      item.tone === 'success'
                        ? 'text-green-500'
                        : item.tone === 'warning'
                          ? 'text-amber-500'
                          : 'text-slate-300'
                    }
                  >
                    {item.tone === 'success' ? '✓' : item.tone === 'warning' ? '…' : '○'}
                  </span>
                  <span className="text-sm font-medium text-admin-text-strong">{item.label}</span>
                </div>
                <span
                  className={
                    item.tone === 'success'
                      ? 'rounded bg-admin-surface-section px-2 py-1 text-[10px] font-bold text-slate-600'
                      : item.tone === 'warning'
                        ? 'rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700'
                        : 'rounded bg-admin-surface-section px-2 py-1 text-[10px] font-bold text-slate-400'
                  }
                >
                  {item.state}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-xl border-0 bg-admin-primary text-white shadow-none">
          <CardContent className="relative z-10 p-6">
            <h3 className="font-admin-display text-2xl font-bold">Next Step: Logic Mapping</h3>
            <p className="mt-3 text-sm leading-6 text-indigo-200">
              {workActionResolution?.note ||
                'The ideation phase is complete. Now configure the transition logic between the detected scenes.'}
            </p>
            <Button
              type="button"
              className="mt-6 h-12 w-full rounded-lg bg-white text-admin-primary hover:bg-indigo-50"
              onClick={() =>
                workActionResolution && onWorkAction
                  ? onWorkAction(workActionResolution.primary.action)
                  : undefined
              }
              disabled={!workActionResolution || !onWorkAction || workActionResolution.primary.disabled}
            >
              {nextStepLabel}
            </Button>
          </CardContent>
          <div className="absolute -bottom-8 -right-8 text-[140px] leading-none text-white/10">◫</div>
        </Card>
      </div>

      <div className="space-y-6 xl:col-span-8">
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Source Integration
            </CardTitle>
            <button className="text-xs font-bold text-admin-primary">Configure Source</button>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6 rounded-xl bg-admin-surface-section p-4">
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-300">
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 text-white">
                  ▶
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-lg font-bold text-admin-text-strong">{sourceLabel}</h4>
                <p className="mt-1 text-xs leading-6 text-admin-text-muted">
                  Linked source for <span className="font-medium text-admin-text-strong">{channelLabel}</span>
                  . Updated {updatedAt}.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <span>Assets / Source</span>
                  <span>{detail?.job.contentType || 'VIDEO'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Latest Execution
            </CardTitle>
            <Link href={`/jobs/${jobId}/timeline`} className="text-xs font-bold text-slate-600 hover:text-admin-primary">
              View History
            </Link>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-admin-surface-section p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Job Status</p>
                <p className="mt-2 text-lg font-bold text-green-600">{status}</p>
              </div>
              <div className="rounded-lg bg-admin-surface-section p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scene Count</p>
                <p className="mt-2 text-lg font-bold text-admin-text-strong">
                  {totalScenes || 0} <span className="text-xs font-normal text-slate-400">Total</span>
                </p>
              </div>
              <div className="rounded-lg bg-admin-surface-section p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Upload ID</p>
                <p className="mt-2 text-lg font-bold text-admin-text-strong">{uploadId}</p>
              </div>
              <div className="rounded-lg bg-admin-surface-section p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Ready Assets</p>
                <p className="mt-2 text-lg font-bold text-admin-text-strong">
                  {readyAssetCount} <span className="text-xs font-normal text-slate-400">Ready</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200/50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-admin-primary">
                  ▣
                </div>
                <div>
                  <p className="text-sm font-bold text-admin-text-strong">Execution Intelligence Report</p>
                  <p className="text-xs text-slate-500">
                    Analysis completed with the latest job metadata and execution snapshots.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="border-indigo-100 bg-indigo-50 text-admin-primary hover:bg-indigo-100">
                  Review Frames
                </Button>
                <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-600">
                  Download Log
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 px-2 py-2 text-sm font-bold text-slate-500 md:flex-row md:items-center md:justify-between">
          <Link href="/jobs" className="hover:text-admin-text-strong">
            Back to Job List
          </Link>
          <div className="flex gap-4">
            <button type="button" className="hover:text-admin-primary">
              Configuration Details
            </button>
            <button type="button" className="hover:text-admin-primary">
              User Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
