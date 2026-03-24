'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import { ChangeEvent, useState } from 'react';

import { SeedForm } from '../model';

type ContentJobDetailSeedFormPanelProps = {
  initialValue: SeedForm;
  /** 제작 아이템 생성 시 또는 이후 실행으로 토픽 플랜 S3가 있는지 */
  hasTopicPlan: boolean;
  isRunningTopicPlan: boolean;
  isSaving: boolean;
  onRunTopicPlan: () => void;
  onSave: (value: SeedForm) => void;
  runError: unknown;
  saveError: unknown;
};

export function ContentJobDetailSeedFormPanel({
  initialValue,
  hasTopicPlan,
  isRunningTopicPlan,
  isSaving,
  onRunTopicPlan,
  onSave,
  runError,
  saveError,
}: ContentJobDetailSeedFormPanelProps) {
  const [seedForm, setSeedForm] = useState<SeedForm>(() => initialValue);
  const sourceUrls = [
    'archdaily.com/99201/ai-architecture-trends',
    'wired.com/story/generative-ai-urban-planning',
  ];

  const onSeedInput = (key: keyof SeedForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setSeedForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  return (
    <Card className="rounded-xl border border-admin-outline-ghost bg-white shadow-none">
      <CardHeader className="pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-admin-text-muted">
          Configuration
        </p>
        <CardTitle className="sr-only">Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="block space-y-2 text-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
            Primary Topic
          </span>
          <Input
            value={seedForm.titleIdea}
            onChange={onSeedInput('titleIdea')}
            className="min-h-12 rounded-lg border-none bg-admin-surface-section shadow-none"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
            Seed Keywords
          </span>
          <textarea
            className="min-h-[132px] w-full rounded-lg border-none bg-admin-surface-section px-4 py-3 text-sm leading-7 text-admin-text-strong outline-none"
            value={seedForm.creativeBrief}
            onChange={(event) =>
              setSeedForm((current) => ({ ...current, creativeBrief: event.target.value }))
            }
          />
        </label>

        <div className="space-y-2">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
            Source URLs
          </span>
          <div className="space-y-2">
            {sourceUrls.map((url) => (
              <div
                key={url}
                className="flex items-center gap-3 rounded-lg bg-admin-surface-section px-3 py-3 text-xs text-admin-text-muted"
              >
                <span className="text-sm leading-none">⊹</span>
                <span className="truncate">{url}</span>
              </div>
            ))}
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-lg border border-dashed border-admin-outline-ghost px-3 py-2.5 text-xs font-semibold text-admin-text-muted"
            >
              + Add New Source
            </button>
          </div>
        </div>

        <div className="hidden">
          <Button disabled={isSaving} onClick={() => onSave(seedForm)}>
            {isSaving ? '저장 중...' : '시드 저장'}
          </Button>
          <Button variant="secondary" disabled={isRunningTopicPlan} onClick={onRunTopicPlan}>
            {isRunningTopicPlan ? '실행 중...' : '토픽 플랜 다시 실행'}
          </Button>
          {hasTopicPlan ? 'plan-ready' : 'plan-pending'}
          {saveError ? <p>{getErrorMessage(saveError)}</p> : null}
          {runError ? <p>{getErrorMessage(runError)}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
