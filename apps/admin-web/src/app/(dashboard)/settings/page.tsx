"use client";

import {
  LlmProvider,
  LlmStepSettings,
  useLlmSettingsQuery,
  useUpdateLlmStepSettingsMutation,
} from "@packages/graphql";
import { Button } from "@packages/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { Input } from "@packages/ui/input";
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type StepFormState = {
  provider: LlmProvider;
  model: string;
  temperature: string;
  maxOutputTokens: string;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
};

const toFormState = (settings: LlmStepSettings): StepFormState => {
  return {
    provider: settings.provider,
    model: settings.model,
    temperature: String(settings.temperature),
    maxOutputTokens:
      settings.maxOutputTokens !== null &&
      settings.maxOutputTokens !== undefined
        ? String(settings.maxOutputTokens)
        : "",
    secretIdEnvVar: settings.secretIdEnvVar,
    promptVersion: settings.promptVersion,
    systemPrompt: settings.systemPrompt,
    userPrompt: settings.userPrompt,
  };
};

const stepTitle = (stepKey: string): string => {
  switch (stepKey) {
    case "topic-plan":
      return "Topic Planning";
    case "scene-json":
      return "Scene JSON";
    case "metadata":
      return "Metadata Generation";
    default:
      return stepKey;
  }
};

function StepSettingsCard({ settings }: { settings: LlmStepSettings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StepFormState>(() => toFormState(settings));
  const mutation = useUpdateLlmStepSettingsMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["llmSettings"] });
    },
  });

  useEffect(() => {
    setForm(toFormState(settings));
  }, [settings]);

  const onInput =
    (key: keyof StepFormState) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stepTitle(settings.stepKey)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Provider</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.provider}
              onChange={onInput("provider")}
            >
              <option value="OPENAI">OPENAI</option>
              <option value="GEMINI">GEMINI</option>
              <option value="BEDROCK">BEDROCK</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Model</span>
            <Input value={form.model} onChange={onInput("model")} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Temperature</span>
            <Input
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={onInput("temperature")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Max Output Tokens</span>
            <Input
              type="number"
              value={form.maxOutputTokens}
              onChange={onInput("maxOutputTokens")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Secret Env Var</span>
            <Input
              value={form.secretIdEnvVar}
              onChange={onInput("secretIdEnvVar")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Prompt Version</span>
            <Input
              value={form.promptVersion}
              onChange={onInput("promptVersion")}
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">System Prompt</span>
          <textarea
            className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.systemPrompt}
            onChange={onInput("systemPrompt")}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">User Prompt</span>
          <textarea
            className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.userPrompt}
            onChange={onInput("userPrompt")}
          />
        </label>

        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            Last updated: {settings.updatedAt} by {settings.updatedBy}
          </span>
          <Button
            onClick={() =>
              mutation.mutate({
                stepKey: settings.stepKey,
                provider: form.provider,
                model: form.model,
                temperature: Number(form.temperature),
                maxOutputTokens: form.maxOutputTokens
                  ? Number(form.maxOutputTokens)
                  : undefined,
                secretIdEnvVar: form.secretIdEnvVar,
                promptVersion: form.promptVersion,
                systemPrompt: form.systemPrompt,
                userPrompt: form.userPrompt,
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(mutation.error)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const settingsQuery = useLlmSettingsQuery();
  const items = useMemo(() => settingsQuery.data ?? [], [settingsQuery.data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LLM Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>단계별 모델, 파라미터, 프롬프트를 DynamoDB 기반으로 관리합니다.</p>
          <p>
            값이 저장되지 않은 단계는 코드 기본값을 fallback으로 사용합니다.
          </p>
        </CardContent>
      </Card>

      {settingsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      ) : null}
      {settingsQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(settingsQuery.error)}
        </p>
      ) : null}

      <div className="grid gap-6">
        {items.map((settings) => (
          <StepSettingsCard key={settings.stepKey} settings={settings} />
        ))}
      </div>
    </div>
  );
}
