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

type SettingsSection =
  | "general"
  | "channels"
  | "models"
  | "providers"
  | "publish-policy"
  | "runtime";

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

export function SettingsPage() {
  const settingsQuery = useLlmSettingsQuery();
  const youtubeConfigsQuery = useYoutubeChannelConfigsQuery();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");
  const items = useMemo(() => settingsQuery.data ?? [], [settingsQuery.data]);
  const youtubeConfigs = useMemo(
    () => youtubeConfigsQuery.data ?? [],
    [youtubeConfigsQuery.data],
  );
  const sectionCards: Array<{
    key: SettingsSection;
    label: string;
    description: string;
  }> = [
    {
      key: "general",
      label: "General",
      description: "글로벌 운영 원칙과 현재 설정 지형을 요약합니다.",
    },
    {
      key: "channels",
      label: "Channels",
      description: "채널 연결, 시크릿, 업로드 기본값을 관리합니다.",
    },
    {
      key: "models",
      label: "Models & Prompts",
      description: "단계별 모델과 프롬프트 기본값을 관리합니다.",
    },
    {
      key: "providers",
      label: "Providers",
      description: "외부 provider 연결 책임과 장애 대응 관점을 정리합니다.",
    },
    {
      key: "publish-policy",
      label: "Publish Policy",
      description:
        "자동 공개, visibility, playlist 등 publish 기본값을 봅니다.",
    },
    {
      key: "runtime",
      label: "Runtime",
      description: "재시도, fallback, 운영 런타임 원칙을 정리합니다.",
    },
  ];
  const channelSummary = useMemo(() => {
    return {
      total: youtubeConfigs.length,
      autoPublish: youtubeConfigs.filter((config) => config.autoPublishEnabled)
        .length,
      withPlaylist: youtubeConfigs.filter((config) =>
        Boolean(config.playlistId),
      ).length,
      envSource: youtubeConfigs.filter((config) => config.source === "env")
        .length,
      dbSource: youtubeConfigs.filter((config) => config.source === "db")
        .length,
    };
  }, [youtubeConfigs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>설정은 현재 콘텐츠 작업 맥락과 분리된 글로벌 관리 영역입니다.</p>
          <p>
            채널 연결, 모델/프롬프트, publish 기본값, 런타임 원칙을 이곳에서
            관리합니다.
          </p>
          <p>
            값이 저장되지 않은 단계는 코드 기본값을 fallback으로 사용합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {sectionCards.map((section) => (
              <Button
                key={section.key}
                variant={activeSection === section.key ? "default" : "outline"}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {sectionCards.find((section) => section.key === activeSection)
              ?.description ?? ""}
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

      {activeSection === "general" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configured Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{channelSummary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto Publish Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {channelSummary.autoPublish}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LLM Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">DB-backed Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {channelSummary.dbSource}
              </p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader>
              <CardTitle>General Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                대시보드는 통합 관제판이고, 실제 조작은 콘텐츠 관리에서
                수행합니다.
              </p>
              <p>
                설정은 채널 연결, 글로벌 모델 기본값, publish 정책을 다룹니다.
              </p>
              <p>
                운영 상태와 병목 정보는 설정이 아니라 콘텐츠 관리와 대시보드에
                남겨둡니다.
              </p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader>
              <CardTitle>Coverage Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Playlist configured: {channelSummary.withPlaylist}</p>
              <p>Env-backed channels: {channelSummary.envSource}</p>
              <p>
                Prompt/model steps:{" "}
                {items.map((item) => stepTitle(item.stepKey)).join(", ") || "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === "channels" ? (
        <>
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

          <div className="grid gap-6">
            {youtubeConfigs.map((config) => (
              <YoutubeChannelConfigCard
                key={config.channelId}
                config={config}
              />
            ))}
            <YoutubeChannelConfigCard />
          </div>
        </>
      ) : null}

      {activeSection === "models" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Models & Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                단계별 모델, temperature, prompt version, prompt 본문을
                관리합니다.
              </p>
              <p>
                계약은 shared schema를 기준으로 유지하고, 저장값이 없으면 코드
                fallback을 사용합니다.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            {items.map((settings) => (
              <StepSettingsCard key={settings.stepKey} settings={settings} />
            ))}
          </div>
        </>
      ) : null}

      {activeSection === "providers" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Provider Ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                외부 provider API key 자체는 시크릿 저장소에 보관하고, 설정
                화면에는 식별자와 운영 정책만 노출합니다.
              </p>
              <p>
                실제 런타임 장애는 대시보드와 콘텐츠 관리에서 감지하고, 기본
                연결 정책만 이 영역에서 유지합니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current LLM Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {items.length === 0 ? (
                <p>등록된 provider step이 아직 없습니다.</p>
              ) : (
                items.map((item) => (
                  <p key={item.stepKey}>
                    {stepTitle(item.stepKey)}: {item.provider} / {item.model}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fallback Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                provider 변경은 가능한 한 동일 계약을 유지한 채 step settings만
                바꾸는 방향으로 다룹니다.
              </p>
              <p>
                서비스 코드는 renderer/provider 세부를 UI 상위 흐름에 새지 않게
                유지합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === "publish-policy" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Auto Publish Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Auto publish enabled channels: {channelSummary.autoPublish}</p>
              <p>
                Manual review channels:{" "}
                {channelSummary.total - channelSummary.autoPublish}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visibility Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {youtubeConfigs.length === 0 ? (
                <p>채널 설정이 아직 없습니다.</p>
              ) : (
                youtubeConfigs.map((config) => (
                  <p key={config.channelId}>
                    {config.channelId}: {config.defaultVisibility ?? "unset"}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Playlist Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Playlist configured channels: {channelSummary.withPlaylist}</p>
              <p>
                Playlist missing channels:{" "}
                {channelSummary.total - channelSummary.withPlaylist}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === "runtime" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Runtime Principles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Asset first, composition second 원칙을 유지합니다.</p>
              <p>
                실패 시 전체 재실행보다 특정 scene/TTS/visual 재실행을
                우선합니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fallback Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                값이 비어 있으면 코드 기본값 또는 환경 변수 fallback을
                사용합니다.
              </p>
              <p>
                운영자가 자주 보는 상태는 대시보드/콘텐츠 관리에 남기고, 런타임
                정책만 여기서 문서화합니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Next Runtime Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                재시도 정책, 기능 토글, provider failover 같은 제어값은 이후 이
                섹션으로 확장합니다.
              </p>
              <p>현재는 channel/model 설정이 실제 운영의 우선순위입니다.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
