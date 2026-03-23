import { Button } from '@packages/ui/button';
import { Card, CardContent } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { Bot, Database, FileArchive, MoreVertical, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import { stepTitle, type LlmStepSettings, useUpdateLlmStepSettings } from '@/entities/llm-step';

type ModelsSectionProps = {
  items: LlmStepSettings[];
};

export function ModelsSection({ items }: ModelsSectionProps) {
  const queryClient = useQueryClient();
  const [activeStepKey, setActiveStepKey] = useState<string>(items[0]?.stepKey ?? '');
  const activeSettings = useMemo(
    () => items.find((item) => item.stepKey === activeStepKey) ?? items[0],
    [activeStepKey, items],
  );
  const [form, setForm] = useState({
    provider: activeSettings?.provider ?? '',
    model: activeSettings?.model ?? '',
    temperature: activeSettings ? String(activeSettings.temperature) : '',
    maxOutputTokens: activeSettings?.maxOutputTokens ? String(activeSettings.maxOutputTokens) : '',
    secretIdEnvVar: activeSettings?.secretIdEnvVar ?? '',
    promptVersion: activeSettings?.promptVersion ?? '',
    systemPrompt: activeSettings?.systemPrompt ?? '',
    userPrompt: activeSettings?.userPrompt ?? '',
  });
  const mutation = useUpdateLlmStepSettings({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['llmSettings'] });
    },
  });

  useEffect(() => {
    if (!items.length) {
      setActiveStepKey('');
      return;
    }
    if (!items.some((item) => item.stepKey === activeStepKey)) {
      setActiveStepKey(items[0]?.stepKey ?? '');
    }
  }, [activeStepKey, items]);

  useEffect(() => {
    if (!activeSettings) {
      return;
    }
    setForm({
      provider: activeSettings.provider,
      model: activeSettings.model,
      temperature: String(activeSettings.temperature),
      maxOutputTokens: activeSettings.maxOutputTokens ? String(activeSettings.maxOutputTokens) : '',
      secretIdEnvVar: activeSettings.secretIdEnvVar ?? '',
      promptVersion: activeSettings.promptVersion ?? '',
      systemPrompt: activeSettings.systemPrompt ?? '',
      userPrompt: activeSettings.userPrompt ?? '',
    });
  }, [activeSettings]);

  const onText =
    (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const onDiscard = () => {
    if (!activeSettings) return;
    setForm({
      provider: activeSettings.provider,
      model: activeSettings.model,
      temperature: String(activeSettings.temperature),
      maxOutputTokens: activeSettings.maxOutputTokens ? String(activeSettings.maxOutputTokens) : '',
      secretIdEnvVar: activeSettings.secretIdEnvVar ?? '',
      promptVersion: activeSettings.promptVersion ?? '',
      systemPrompt: activeSettings.systemPrompt ?? '',
      userPrompt: activeSettings.userPrompt ?? '',
    });
  };

  const onSave = () => {
    if (!activeSettings) return;
    mutation.mutate({
      stepKey: activeSettings.stepKey,
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

  const quotaPercent = Math.max(24, Math.min(84, 35 + items.length * 12));
  const tokenCount =
    form.systemPrompt.trim().split(/\s+/).filter(Boolean).length +
    form.userPrompt.trim().split(/\s+/).filter(Boolean).length;
  const selectedTemperature = Number(form.temperature || 0);
  const selectedMaxTokens = Number(form.maxOutputTokens || 0);

  if (!activeSettings) {
    return (
      <div className="rounded-xl border border-admin-outline-ghost/10 bg-admin-surface-card p-8 text-sm text-admin-text-muted">
        모델 설정 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-admin-outline-ghost/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-admin-text-muted">
              Active Stage
            </label>
            <select
              className="cursor-pointer rounded-lg border-none bg-admin-surface-section px-4 py-2 text-sm font-semibold text-admin-text-strong outline-none ring-0 focus:ring-2 focus:ring-admin-primary/20"
              value={activeStepKey}
              onChange={(event) => setActiveStepKey(event.target.value)}
            >
              {items.map((item) => (
                <option key={item.stepKey} value={item.stepKey}>
                  {stepTitle(item.stepKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-admin-text-muted hover:text-admin-primary"
              onClick={onDiscard}
            >
              Discard Changes
            </Button>
            <Button
              className="bg-linear-to-br from-admin-primary to-admin-primary-container text-white shadow-lg shadow-slate-900/10"
              onClick={onSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Save Workspace…' : 'Save Workspace'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <div className="rounded-xl border border-admin-outline-ghost/10 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-admin-primary">
                <Bot className="size-4 text-indigo-500" />
                System Prompt
              </h3>
              <span className="rounded bg-admin-surface-section px-2 py-1 font-mono text-[10px] text-admin-text-muted">
                {tokenCount.toLocaleString()} tokens
              </span>
            </div>
            <div className="group relative">
              <textarea
                className="min-h-[320px] w-full resize-none rounded-xl border-none bg-admin-surface-section px-5 py-5 font-mono text-sm leading-relaxed text-admin-text-strong outline-none ring-0 focus:ring-2 focus:ring-admin-primary/20"
                value={form.systemPrompt}
                onChange={onText('systemPrompt')}
                placeholder="Enter system instructions here..."
              />
              <div className="pointer-events-none absolute bottom-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <Sparkles className="size-4 text-admin-primary" />
                </div>
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <MoreVertical className="size-4 text-admin-primary" />
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-admin-text-muted">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-admin-surface-card text-[10px]">
                i
              </span>
              Use variable syntax {'{{script_context}}'} to inject dynamic runtime data.
            </p>
          </div>

          <div className="rounded-xl border border-admin-outline-ghost/10 bg-admin-surface-section p-8">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.24em] text-admin-primary">
              Contextual Injection
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded bg-indigo-50">
                    <Database className="size-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-admin-text-strong">Prompt Version</p>
                    <p className="text-xs text-admin-text-muted">
                      {form.promptVersion || 'No version tag attached'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                    ENABLED
                  </span>
                  <MoreVertical className="size-4 text-admin-text-muted" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded bg-slate-50">
                    <FileArchive className="size-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-admin-text-strong">Secret Env Var</p>
                    <p className="text-xs text-admin-text-muted">
                      {form.secretIdEnvVar || 'No source attached'}
                    </p>
                  </div>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:underline">
                  Link Source
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-4">
          <Card className="border-admin-outline-ghost/10 bg-white shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-admin-text-muted">
                Inference Model
              </h3>
              <div className="space-y-2">
                {[
                  {
                    provider: activeSettings.provider,
                    model: form.model,
                    desc: 'Optimal for creative scene design',
                    selected: true,
                  },
                  {
                    provider: activeSettings.provider === 'OPENAI' ? 'GEMINI' : 'OPENAI',
                    model:
                      activeSettings.provider === 'OPENAI' ? 'Gemini 2.0 Flash' : 'GPT-4o mini',
                    desc: 'Best for logic & asset prompts',
                    selected: false,
                  },
                ].map((option) => (
                  <label
                    key={`${option.provider}-${option.model}`}
                    className={
                      option.selected
                        ? 'flex cursor-pointer items-center rounded-lg border-2 border-admin-primary bg-indigo-50/30 p-3 transition-all'
                        : 'flex cursor-pointer items-center rounded-lg border border-admin-outline-ghost/20 p-3 transition-all hover:bg-admin-surface-section'
                    }
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100">
                        <Bot className="size-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-admin-text-strong">{option.model}</p>
                        <p className="text-[10px] text-admin-text-muted">{option.desc}</p>
                      </div>
                      <div
                        className={
                          option.selected
                            ? 'size-4 rounded-full border-4 border-admin-primary bg-white'
                            : 'size-4 rounded-full border border-admin-outline-ghost bg-white'
                        }
                      />
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-admin-outline-ghost/10 bg-white shadow-sm">
            <CardContent className="space-y-8 p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-admin-text-muted">
                Inference Parameters
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-admin-primary">Temperature</label>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600">
                    {selectedTemperature.toFixed(2)}
                  </span>
                </div>
                <input
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-admin-surface-section accent-admin-primary"
                  max="2"
                  min="0"
                  step="0.01"
                  type="range"
                  value={form.temperature || '0'}
                  onChange={onText('temperature')}
                />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-admin-text-muted">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-admin-primary">Max Tokens</label>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600">
                    {(selectedMaxTokens || 4096).toLocaleString()}
                  </span>
                </div>
                <input
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-admin-surface-section accent-admin-primary"
                  max="32768"
                  min="256"
                  step="128"
                  type="range"
                  value={form.maxOutputTokens || '4096'}
                  onChange={onText('maxOutputTokens')}
                />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-admin-text-muted">
                  <span>Small</span>
                  <span>Standard</span>
                  <span>Deep</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-admin-primary">Top P</label>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600">
                    1.0
                  </span>
                </div>
                <input
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-admin-surface-section accent-admin-primary"
                  max="1"
                  min="0"
                  step="0.01"
                  type="range"
                  value="1"
                  readOnly
                />
              </div>

              <div className="space-y-4 border-t border-admin-outline-ghost/10 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-admin-text-muted">
                    Stream responses
                  </span>
                  <div className="relative h-5 w-10 rounded-full bg-indigo-600">
                    <div className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-admin-text-muted">
                    JSON Mode enforcement
                  </span>
                  <div className="relative h-5 w-10 rounded-full bg-admin-surface-section">
                    <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-xl bg-indigo-900 p-6 shadow-2xl">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/5 blur-2xl" />
            <h4 className="text-sm font-bold text-white">Need assistance?</h4>
            <p className="mt-2 text-xs leading-relaxed text-indigo-200">
              Consult our documentation for prompt engineering best practices and model comparisons.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white transition-all hover:gap-3">
              Open Documentation
              <span className="text-sm">↗</span>
            </button>
          </div>
        </div>
      </div>

      {mutation.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
      ) : null}
    </div>
  );
}
