'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { stepTitle, type LlmStepSettings, useUpdateLlmStepSettings } from '@/entities/llm-step';

import { toStepFormState } from '../lib/step';
import { type StepFormState } from '../model/form';
import { StepSettingsFormFields } from './step-settings-form-fields';

type StepSettingsCardProps = {
  settings: LlmStepSettings;
};

export function StepSettingsCard({ settings }: StepSettingsCardProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StepFormState>(() => toStepFormState(settings));
  const mutation = useUpdateLlmStepSettings({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['llmSettings'] });
    },
  });

  useEffect(() => {
    setForm(toStepFormState(settings));
  }, [settings]);

  const onInput =
    (key: keyof StepFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const onSave = () => {
    mutation.mutate({
      stepKey: settings.stepKey,
      provider: form.provider,
      model: form.model,
      temperature: Number(form.temperature),
      maxOutputTokens: form.maxOutputTokens ? Number(form.maxOutputTokens) : undefined,
      secretIdEnvVar: form.secretIdEnvVar,
      promptVersion: form.promptVersion,
      systemPrompt: form.systemPrompt,
      userPrompt: form.userPrompt,
    });
  };

  return (
    <Card className="border-admin-outline-ghost bg-admin-surface-card shadow-sm">
      <CardHeader className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
          Defaults
        </p>
        <CardTitle className="text-base text-admin-text-strong">
          {stepTitle(settings.stepKey)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StepSettingsFormFields form={form} onInput={onInput} />
        <div className="flex items-center justify-between gap-4 text-xs text-admin-text-muted">
          <span>
            마지막 반영: {settings.updatedAt} · {settings.updatedBy}
          </span>
          <Button onClick={onSave} disabled={mutation.isPending}>
            {mutation.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
        {mutation.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
