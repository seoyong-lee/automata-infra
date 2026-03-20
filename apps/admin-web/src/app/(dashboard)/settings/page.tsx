"use client";

import {
  LlmProvider,
  LlmStepSettings,
  useLlmSettingsQuery,
  useDeleteYoutubeChannelConfigMutation,
  useUpsertYoutubeChannelConfigMutation,
  useUpdateLlmStepSettingsMutation,
  useYoutubeChannelConfigsQuery,
  YoutubeChannelConfig,
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

type YoutubeChannelConfigForm = {
  channelId: string;
  youtubeSecretName: string;
  youtubeAccountType: string;
  autoPublishEnabled: boolean;
  defaultVisibility: "private" | "unlisted" | "public";
  defaultCategoryId: string;
  playlistId: string;
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

const toYoutubeChannelConfigForm = (
  config?: YoutubeChannelConfig,
): YoutubeChannelConfigForm => {
  return {
    channelId: config?.channelId ?? "",
    youtubeSecretName: config?.youtubeSecretName ?? "",
    youtubeAccountType: config?.youtubeAccountType ?? "",
    autoPublishEnabled: config?.autoPublishEnabled ?? false,
    defaultVisibility: config?.defaultVisibility ?? "private",
    defaultCategoryId:
      config?.defaultCategoryId !== null &&
      config?.defaultCategoryId !== undefined
        ? String(config.defaultCategoryId)
        : "22",
    playlistId: config?.playlistId ?? "",
  };
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

function YoutubeChannelConfigCard({
  config,
}: {
  config?: YoutubeChannelConfig;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<YoutubeChannelConfigForm>(() =>
    toYoutubeChannelConfigForm(config),
  );
  const upsertMutation = useUpsertYoutubeChannelConfigMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["youtubeChannelConfigs"],
      });
    },
  });
  const deleteMutation = useDeleteYoutubeChannelConfigMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["youtubeChannelConfigs"],
      });
      setForm(toYoutubeChannelConfigForm());
    },
  });

  useEffect(() => {
    setForm(toYoutubeChannelConfigForm(config));
  }, [config]);

  const onInput =
    (key: keyof YoutubeChannelConfigForm) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((current) => ({
        ...current,
        [key]:
          event.target instanceof HTMLInputElement &&
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value,
      }));
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {config?.channelId
            ? `YouTube Channel: ${config.channelId}`
            : "Add YouTube Channel"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Channel ID</span>
            <Input value={form.channelId} onChange={onInput("channelId")} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Secret Name</span>
            <Input
              value={form.youtubeSecretName}
              onChange={onInput("youtubeSecretName")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Account Type</span>
            <Input
              value={form.youtubeAccountType}
              onChange={onInput("youtubeAccountType")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Default Visibility</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.defaultVisibility}
              onChange={onInput("defaultVisibility")}
            >
              <option value="private">private</option>
              <option value="unlisted">unlisted</option>
              <option value="public">public</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Default Category ID</span>
            <Input
              type="number"
              value={form.defaultCategoryId}
              onChange={onInput("defaultCategoryId")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Playlist ID</span>
            <Input value={form.playlistId} onChange={onInput("playlistId")} />
          </label>
          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoPublishEnabled}
              onChange={onInput("autoPublishEnabled")}
            />
            <span className="font-medium">Auto publish enabled</span>
          </label>
        </div>

        {config ? (
          <p className="text-xs text-muted-foreground">
            Source: {config.source} / Last updated: {config.updatedAt || "-"} by{" "}
            {config.updatedBy}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            새 channelId를 추가하면 DB 기반으로 YouTube 시크릿 매핑을 바로
            관리할 수 있습니다.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            disabled={upsertMutation.isPending}
            onClick={() =>
              upsertMutation.mutate({
                channelId: form.channelId,
                youtubeSecretName: form.youtubeSecretName,
                youtubeAccountType: form.youtubeAccountType || undefined,
                autoPublishEnabled: form.autoPublishEnabled,
                defaultVisibility: form.defaultVisibility,
                defaultCategoryId: form.defaultCategoryId
                  ? Number(form.defaultCategoryId)
                  : undefined,
                playlistId: form.playlistId || undefined,
              })
            }
          >
            {upsertMutation.isPending
              ? "Saving..."
              : config
                ? "Save Channel"
                : "Add Channel"}
          </Button>
          {config ? (
            <Button
              variant="outline"
              disabled={deleteMutation.isPending || config.source !== "db"}
              onClick={() =>
                deleteMutation.mutate({ channelId: config.channelId })
              }
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Channel"}
            </Button>
          ) : null}
        </div>

        {upsertMutation.error ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(upsertMutation.error)}
          </p>
        ) : null}
        {deleteMutation.error ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(deleteMutation.error)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const settingsQuery = useLlmSettingsQuery();
  const youtubeConfigsQuery = useYoutubeChannelConfigsQuery();
  const items = useMemo(() => settingsQuery.data ?? [], [settingsQuery.data]);
  const youtubeConfigs = useMemo(
    () => youtubeConfigsQuery.data ?? [],
    [youtubeConfigsQuery.data],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>콘텐츠와 동위치의 글로벌 운영 설정 화면입니다.</p>
          <p>단계별 모델, 파라미터, 프롬프트를 DynamoDB 기반으로 관리합니다.</p>
          <p>
            값이 저장되지 않은 단계는 코드 기본값을 fallback으로 사용합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>YouTube Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            채널 ID별 YouTube OAuth secret 이름과 업로드 기본값을 DB에서
            관리합니다.
          </p>
          <p>
            secret 자체는 Secrets Manager에 두고, 여기에는 secret name만
            저장합니다.
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
      {youtubeConfigsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading YouTube channels...
        </p>
      ) : null}
      {youtubeConfigsQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(youtubeConfigsQuery.error)}
        </p>
      ) : null}

      <div className="grid gap-6">
        {youtubeConfigs.map((config) => (
          <YoutubeChannelConfigCard key={config.channelId} config={config} />
        ))}
        <YoutubeChannelConfigCard />
      </div>

      <div className="grid gap-6">
        {items.map((settings) => (
          <StepSettingsCard key={settings.stepKey} settings={settings} />
        ))}
      </div>
    </div>
  );
}
