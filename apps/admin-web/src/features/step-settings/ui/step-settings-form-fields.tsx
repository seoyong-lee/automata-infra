import { Input } from '@packages/ui/input';
import type { ChangeEvent } from 'react';

import { type StepFormState } from '../model/form';

type StepSettingsFormFieldsProps = {
  form: StepFormState;
  onInput: (
    key: keyof StepFormState,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

export function StepSettingsFormFields({ form, onInput }: StepSettingsFormFieldsProps) {
  const fieldClassName =
    'border-admin-outline-ghost bg-admin-surface-field text-admin-text-strong placeholder:text-admin-text-muted';
  const selectClassName =
    'flex h-9 w-full rounded-md border border-admin-outline-ghost bg-admin-surface-field px-3 py-1 text-sm text-admin-text-strong';

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">프로바이더</span>
          <select className={selectClassName} value={form.provider} onChange={onInput('provider')}>
            <option value="OPENAI">OPENAI</option>
            <option value="GEMINI">GEMINI</option>
            <option value="BEDROCK">BEDROCK</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">모델</span>
          <Input className={fieldClassName} value={form.model} onChange={onInput('model')} />
        </label>
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">Temperature</span>
          <Input
            className={fieldClassName}
            type="number"
            step="0.1"
            value={form.temperature}
            onChange={onInput('temperature')}
          />
        </label>
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">최대 출력 토큰</span>
          <Input
            className={fieldClassName}
            type="number"
            value={form.maxOutputTokens}
            onChange={onInput('maxOutputTokens')}
          />
        </label>
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">시크릿 env var</span>
          <Input
            className={fieldClassName}
            value={form.secretIdEnvVar}
            onChange={onInput('secretIdEnvVar')}
          />
        </label>
        <label className="space-y-2 text-sm text-admin-text-strong">
          <span className="font-medium">프롬프트 버전</span>
          <Input
            className={fieldClassName}
            value={form.promptVersion}
            onChange={onInput('promptVersion')}
          />
        </label>
      </div>

      <label className="space-y-2 text-sm text-admin-text-strong">
        <span className="font-medium">시스템 프롬프트</span>
        <textarea
          className="min-h-32 w-full rounded-md border border-admin-outline-ghost bg-admin-surface-field px-3 py-2 text-sm text-admin-text-strong"
          value={form.systemPrompt}
          onChange={onInput('systemPrompt')}
        />
      </label>

      <label className="space-y-2 text-sm text-admin-text-strong">
        <span className="font-medium">유저 프롬프트</span>
        <textarea
          className="min-h-40 w-full rounded-md border border-admin-outline-ghost bg-admin-surface-field px-3 py-2 text-sm text-admin-text-strong"
          value={form.userPrompt}
          onChange={onInput('userPrompt')}
        />
      </label>
    </>
  );
}
