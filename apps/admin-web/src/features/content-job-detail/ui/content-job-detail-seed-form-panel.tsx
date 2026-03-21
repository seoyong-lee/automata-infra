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
  const fields: Array<{
    key: keyof SeedForm;
    label: string;
    className?: string;
    type?: 'number';
  }> = [
    { key: 'contentId', label: 'Content ID' },
    { key: 'targetLanguage', label: 'Target Language' },
    { key: 'titleIdea', label: 'Title Idea', className: 'md:col-span-2' },
    {
      key: 'targetDurationSec',
      label: 'Target Duration Sec',
      type: 'number',
    },
    { key: 'stylePreset', label: 'Style Preset' },
  ];

  const onSeedInput = (key: keyof SeedForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setSeedForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>토픽 (시드)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          제목·길이·스타일은 메타 정보이고, 아래 &quot;기획 메모&quot;에 각 씬에서 말할 내용·톤·금지
          사항 등을 자유롭게 적으면 Scene JSON 생성 시 프롬프트에 반영됩니다. 제작 아이템을 만들 때
          이미 토픽 플랜까지 진행된 경우, 시드를 고친 뒤 저장하고 필요할 때만 플랜을 다시 돌리면
          됩니다.
        </p>
        {hasTopicPlan ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            토픽 플랜이 준비된 상태입니다. 시드를 바꾼 경우 저장 후 &quot;토픽 플랜 다시
            실행&quot;을 누르세요.
          </p>
        ) : (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            아직 토픽 플랜이 없습니다. 아래에서 실행하거나, 제작 아이템을 새로 만들 때 함께 생성되게
            할 수 있습니다.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className={`space-y-2 text-sm ${field.className ?? ''}`}>
              <span className="font-medium">{field.label}</span>
              <Input
                type={field.type}
                value={seedForm[field.key]}
                onChange={onSeedInput(field.key)}
              />
            </label>
          ))}
        </div>
        <label className="block space-y-2 text-sm md:col-span-2">
          <span className="font-medium">기획 메모 (씬 방향·비트·톤)</span>
          <textarea
            className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="예: 1씬은 후킹 질문으로 시작, 2~3씬은 역사 맥락, 마지막은 한 줄 정리. 피해야 할 표현: …"
            value={seedForm.creativeBrief}
            onChange={(event) =>
              setSeedForm((current) => ({ ...current, creativeBrief: event.target.value }))
            }
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving} onClick={() => onSave(seedForm)}>
            {isSaving ? '저장 중...' : '시드 저장'}
          </Button>
          <Button variant="secondary" disabled={isRunningTopicPlan} onClick={onRunTopicPlan}>
            {isRunningTopicPlan ? '실행 중...' : '토픽 플랜 다시 실행'}
          </Button>
        </div>
        {saveError ? (
          <p className="text-sm text-destructive">{getErrorMessage(saveError)}</p>
        ) : null}
        {runError ? <p className="text-sm text-destructive">{getErrorMessage(runError)}</p> : null}
      </CardContent>
    </Card>
  );
}
