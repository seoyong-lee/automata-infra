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
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Provider</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={form.provider}
            onChange={onInput('provider')}
          >
            <option value="OPENAI">OPENAI</option>
            <option value="GEMINI">GEMINI</option>
            <option value="BEDROCK">BEDROCK</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Model</span>
          <Input value={form.model} onChange={onInput('model')} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Temperature</span>
          <Input
            type="number"
            step="0.1"
            value={form.temperature}
            onChange={onInput('temperature')}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Max Output Tokens</span>
          <Input type="number" value={form.maxOutputTokens} onChange={onInput('maxOutputTokens')} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Secret Env Var</span>
          <Input value={form.secretIdEnvVar} onChange={onInput('secretIdEnvVar')} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Prompt Version</span>
          <Input value={form.promptVersion} onChange={onInput('promptVersion')} />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium">System Prompt</span>
        <textarea
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.systemPrompt}
          onChange={onInput('systemPrompt')}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">User Prompt</span>
        <textarea
          className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.userPrompt}
          onChange={onInput('userPrompt')}
        />
      </label>
    </>
  );
}
