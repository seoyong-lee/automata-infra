'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import { ChangeEvent, useState } from 'react';

import { SeedForm } from '../model';

type ContentJobDetailSeedFormPanelProps = {
  initialValue: SeedForm;
  isRunningTopicPlan: boolean;
  isSaving: boolean;
  onRunTopicPlan: () => void;
  onSave: (value: SeedForm) => void;
  runError: unknown;
  saveError: unknown;
};

export function ContentJobDetailSeedFormPanel({
  initialValue,
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
        <CardTitle>아이데이션</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving} onClick={() => onSave(seedForm)}>
            {isSaving ? '저장 중...' : '아이데이션 저장'}
          </Button>
          <Button variant="secondary" disabled={isRunningTopicPlan} onClick={onRunTopicPlan}>
            {isRunningTopicPlan ? '실행 중...' : '아이데이션 실행'}
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
