"use client";

import {
  useJobDraftQuery,
  useRequestUploadMutation,
  useRunAssetGenerationMutation,
  useRunSceneJsonMutation,
  useRunTopicPlanMutation,
  useUpdateSceneJsonMutation,
  useUpdateTopicSeedMutation,
} from "@packages/graphql";
import { Button } from "@packages/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { Input } from "@packages/ui/input";
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type WorkspaceView =
  | "overview"
  | "jobs"
  | "assets"
  | "uploads"
  | "templates"
  | "logs";

type SeedForm = {
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
};

const toSeedForm = (input?: {
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
}): SeedForm => {
  return {
    channelId: input?.channelId ?? "",
    targetLanguage: input?.targetLanguage ?? "",
    titleIdea: input?.titleIdea ?? "",
    targetDurationSec:
      typeof input?.targetDurationSec === "number"
        ? String(input.targetDurationSec)
        : "45",
    stylePreset: input?.stylePreset ?? "",
  };
};

const buildExperimentScore = (input: {
  status?: string;
  sceneCount: number;
  assetReadyCount: number;
  autoPublish?: boolean | null;
}) => {
  const base =
    input.status === "UPLOADED"
      ? 92
      : input.status === "RENDERED"
        ? 80
        : input.status === "ASSETS_READY"
          ? 72
          : input.status === "SCENE_JSON_READY"
            ? 61
            : 45;
  const coverageBonus =
    input.sceneCount > 0 ? Math.min(6, input.assetReadyCount * 2) : 0;
  const publishBonus = input.autoPublish ? 3 : 0;
  return base + coverageBonus + publishBonus;
};

const workspaceViews: Array<{
  key: WorkspaceView;
  label: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    description: "현재 콘텐츠 라인과 잡 상태를 빠르게 요약합니다.",
  },
  {
    key: "jobs",
    label: "Jobs",
    description: "topic seed, scene JSON, 재생성 액션을 다룹니다.",
  },
  {
    key: "assets",
    label: "Assets",
    description: "scene별 에셋 커버리지와 자산 생성 상태를 확인합니다.",
  },
  {
    key: "uploads",
    label: "Uploads",
    description: "업로드 정책, 승인 흐름, publish 액션을 다룹니다.",
  },
  {
    key: "templates",
    label: "Templates",
    description: "옵션 트랙과 variant 비교 관점을 정리합니다.",
  },
  {
    key: "logs",
    label: "Logs",
    description: "현재 job의 운영 메모와 상태 추적 포인트를 봅니다.",
  },
];

export function ContentJobDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? "";
  const detailQuery = useJobDraftQuery({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data;
  const contentBrief = detail?.contentBrief;

  const [seedForm, setSeedForm] = useState<SeedForm>(() => toSeedForm());
  const [sceneJsonText, setSceneJsonText] = useState<string>("");
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");

  useEffect(() => {
    const source = detail?.topicSeed ?? detail?.topicPlan;
    setSeedForm(toSeedForm(source ?? undefined));
  }, [detail?.topicSeed, detail?.topicPlan]);

  useEffect(() => {
    if (!detail?.sceneJson) {
      setSceneJsonText("");
      return;
    }
    setSceneJsonText(JSON.stringify(detail.sceneJson, null, 2));
  }, [detail?.sceneJson]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["jobDraft", jobId] });
    await queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
  };

  const updateTopicSeed = useUpdateTopicSeedMutation({
    onSuccess: async () => refresh(),
  });
  const runTopicPlan = useRunTopicPlanMutation({
    onSuccess: async () => refresh(),
  });
  const runSceneJson = useRunSceneJsonMutation({
    onSuccess: async () => refresh(),
  });
  const updateSceneJson = useUpdateSceneJsonMutation({
    onSuccess: async () => refresh(),
  });
  const runAssetGeneration = useRunAssetGenerationMutation({
    onSuccess: async () => refresh(),
  });
  const requestUpload = useRequestUploadMutation({
    onSuccess: async () => refresh(),
  });

  const onSeedInput =
    (key: keyof SeedForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setSeedForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const sceneCount = useMemo(
    () => detail?.sceneJson?.scenes.length ?? detail?.assets.length ?? 0,
    [detail?.assets.length, detail?.sceneJson?.scenes.length],
  );
  const readyAssetCount = useMemo(() => {
    return (detail?.assets ?? []).filter(
      (asset) => asset.imageS3Key || asset.videoClipS3Key || asset.voiceS3Key,
    ).length;
  }, [detail?.assets]);
  const experimentOptions = useMemo(() => {
    return [
      {
        title: "Scene Package",
        value: "structured scene JSON",
        note: "renderer-independent timeline source of truth",
      },
      {
        title: "Layout Preset",
        value:
          detail?.job.contentType === "daily-total"
            ? "headline-top"
            : detail?.job.contentType === "tarot-daily"
              ? "fact-card"
              : "caption-heavy",
        note: "template candidate for next rerender",
      },
      {
        title: "Renderer Track",
        value:
          detail?.job.status === "RENDERED" || detail?.job.status === "UPLOADED"
            ? "ShotstackRenderer MVP"
            : "renderer abstraction ready",
        note: "FFmpeg/Fargate swap should stay behind same scene package",
      },
      {
        title: "Asset Strategy",
        value:
          readyAssetCount > 0 ? "asset-first orchestration" : "awaiting assets",
        note: "image / video / voice generated before final composition",
      },
    ];
  }, [detail?.job.contentType, detail?.job.status, readyAssetCount]);
  const compareRows = useMemo(() => {
    const score = buildExperimentScore({
      status: detail?.job.status,
      sceneCount,
      assetReadyCount: readyAssetCount,
      autoPublish: detail?.job.autoPublish,
    });
    return [
      {
        label: contentBrief?.variant ?? detail?.job.variant ?? "current",
        focus: "balanced current",
        hook: "current hook",
        renderer:
          detail?.job.status === "RENDERED" || detail?.job.status === "UPLOADED"
            ? "shotstack"
            : "scene-only",
        score,
      },
      {
        label: "hook-boost",
        focus: "stronger headline / caption opening",
        hook: "more aggressive hook",
        renderer: "same renderer",
        score: Math.max(0, score - 4),
      },
      {
        label: "visual-fallback",
        focus: "image-first fallback / lighter assets",
        hook: "same hook",
        renderer: "shotstack -> ffmpeg spike",
        score: Math.max(0, score - 8),
      },
    ];
  }, [
    contentBrief?.variant,
    detail?.job.autoPublish,
    detail?.job.status,
    detail?.job.variant,
    readyAssetCount,
    sceneCount,
  ]);

  const contentLineHref = useMemo(() => {
    const channelId = detail?.job.channelId;
    const contentType = contentBrief?.contentType ?? detail?.job.contentType;
    if (!channelId) {
      return "/jobs";
    }
    if (!contentType) {
      return `/jobs?channelId=${encodeURIComponent(channelId)}`;
    }
    return `/jobs?channelId=${encodeURIComponent(channelId)}&contentType=${encodeURIComponent(contentType)}`;
  }, [
    contentBrief?.contentType,
    detail?.job.channelId,
    detail?.job.contentType,
  ]);

  const logs = useMemo(() => {
    return [
      {
        label: "Current status",
        value: detail?.job.status ?? "-",
        note: "콘텐츠 라인 내부에서 이 잡이 어느 단계에 있는지 보여줍니다.",
      },
      {
        label: "Topic seed ready",
        value: detail?.topicSeed ? "yes" : "no",
        note: "사람이 직접 편집 가능한 seed 초안이 저장되었는지 확인합니다.",
      },
      {
        label: "Scene JSON ready",
        value: detail?.sceneJson ? "yes" : "no",
        note: "renderer-neutral scene package가 준비되었는지 나타냅니다.",
      },
      {
        label: "Asset coverage",
        value: `${readyAssetCount}/${detail?.assets.length ?? 0}`,
        note: "scene별 이미지/비디오/보이스 중 최소 하나라도 준비된 비율입니다.",
      },
      {
        label: "Publish path",
        value:
          (contentBrief?.autoPublish ?? detail?.job.autoPublish)
            ? "auto publish"
            : "manual review",
        note: "업로드 전 review gate가 필요한지 빠르게 판단합니다.",
      },
      {
        label: "Last updated",
        value: detail?.job.updatedAt ?? "-",
        note: "운영자가 마지막으로 이 잡을 다시 확인해야 할 시점을 가늠합니다.",
      },
    ];
  }, [
    contentBrief?.autoPublish,
    detail?.assets.length,
    detail?.job.autoPublish,
    detail?.job.status,
    detail?.job.updatedAt,
    detail?.sceneJson,
    detail?.topicSeed,
    readyAssetCount,
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/jobs" className="hover:text-primary">
              콘텐츠 관리
            </Link>
            <span>/</span>
            <Link href={contentLineHref} className="hover:text-primary">
              {detail?.job.channelId ?? "channel"}
            </Link>
            <span>/</span>
            <span>
              {contentBrief?.contentType ?? detail?.job.contentType ?? "job"}
            </span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Content Job Deep Workspace</CardTitle>
              <p className="text-sm text-muted-foreground">
                선택된 채널과 콘텐츠 라인 안에서 특정 잡을 심화 편집하는
                화면입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="text-sm text-primary hover:underline"
                href={contentLineHref}
              >
                Back to Content Line
              </Link>
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = `/jobs/new?channelId=${encodeURIComponent(detail?.job.channelId ?? "")}${detail?.job.contentType ? `&contentType=${encodeURIComponent(detail.job.contentType)}` : ""}`)
                }
                disabled={!detail?.job.channelId}
              >
                New Job in Line
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Job ID</p>
            <p className="mt-1 font-mono text-xs">{jobId}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-medium">
              {detail?.job.status ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Content Type</p>
            <p className="mt-1 text-sm font-medium">
              {contentBrief?.contentType ?? detail?.job.contentType ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Channel</p>
            <p className="mt-1 text-sm font-medium">
              {detail?.job.channelId ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Scene Count</p>
            <p className="mt-1 text-sm font-medium">{sceneCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Est. Cost</p>
            <p className="mt-1 text-sm font-medium">
              ${((sceneCount || 5) * 0.06).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading job draft...</p>
      ) : null}
      {detailQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(detailQuery.error)}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Content Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {
              "이 화면은 콘텐츠 관리 > 채널 > 콘텐츠 라인 > 잡 순서 중 마지막 깊은 작업 공간입니다."
            }
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Content line</p>
              <p className="mt-1 font-medium">
                {contentBrief?.contentType ?? detail?.job.contentType ?? "-"}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Variant</p>
              <p className="mt-1 font-medium">
                {contentBrief?.variant ?? detail?.job.variant ?? "-"}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Publish Mode</p>
              <p className="mt-1 font-medium">
                {(contentBrief?.autoPublish ?? detail?.job.autoPublish)
                  ? "Auto publish"
                  : "Needs review"}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Publish At</p>
              <p className="mt-1 font-medium">
                {contentBrief?.publishAt ?? detail?.job.publishAt ?? "-"}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">Target Platform</p>
              <p className="mt-1 font-medium">
                {contentBrief?.targetPlatform ?? "youtube-shorts"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Views</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {workspaceViews.map((view) => (
              <Button
                key={view.key}
                variant={activeView === view.key ? "default" : "outline"}
                onClick={() => setActiveView(view.key)}
              >
                {view.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {
              workspaceViews.find((view) => view.key === activeView)
                ?.description
            }
          </p>
        </CardContent>
      </Card>

      {activeView === "overview" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Recent upload</p>
                <p className="mt-1 font-medium">
                  {detail?.job.uploadVideoId ?? "not uploaded yet"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Review queue</p>
                <p className="mt-1 font-medium">
                  {detail?.job.reviewAction ?? "PENDING"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Assets ready</p>
                <p className="mt-1 font-medium">
                  {readyAssetCount}/{detail?.assets.length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Active template</p>
                <p className="mt-1 font-medium">
                  {seedForm.stylePreset || "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Production Option Tracks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {experimentOptions.map((item) => (
                <div key={item.title} className="rounded-lg border p-4 text-sm">
                  <p className="text-xs text-muted-foreground">{item.title}</p>
                  <p className="mt-1 font-medium">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.note}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeView === "jobs" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Script Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Channel ID</span>
                  <Input
                    value={seedForm.channelId}
                    onChange={onSeedInput("channelId")}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Target Language</span>
                  <Input
                    value={seedForm.targetLanguage}
                    onChange={onSeedInput("targetLanguage")}
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium">Title Idea</span>
                  <Input
                    value={seedForm.titleIdea}
                    onChange={onSeedInput("titleIdea")}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Target Duration Sec</span>
                  <Input
                    type="number"
                    value={seedForm.targetDurationSec}
                    onChange={onSeedInput("targetDurationSec")}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Style Preset</span>
                  <Input
                    value={seedForm.stylePreset}
                    onChange={onSeedInput("stylePreset")}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={updateTopicSeed.isPending}
                  onClick={() =>
                    updateTopicSeed.mutate({
                      jobId,
                      channelId: seedForm.channelId,
                      targetLanguage: seedForm.targetLanguage,
                      titleIdea: seedForm.titleIdea,
                      targetDurationSec: Number(seedForm.targetDurationSec),
                      stylePreset: seedForm.stylePreset,
                    })
                  }
                >
                  {updateTopicSeed.isPending ? "Saving..." : "Save Topic Seed"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={runTopicPlan.isPending}
                  onClick={() => runTopicPlan.mutate({ jobId })}
                >
                  {runTopicPlan.isPending ? "Running..." : "Run Topic Plan"}
                </Button>
              </div>
              {updateTopicSeed.error ? (
                <p className="text-sm text-destructive">
                  {getErrorMessage(updateTopicSeed.error)}
                </p>
              ) : null}
              {runTopicPlan.error ? (
                <p className="text-sm text-destructive">
                  {getErrorMessage(runTopicPlan.error)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scene Build</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {compareRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{row.label}</p>
                    <p className="mt-1 text-muted-foreground">{row.focus}</p>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>Hook: {row.hook}</p>
                      <p>Renderer: {row.renderer}</p>
                      <p>Score: {row.score}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={runSceneJson.isPending}
                  onClick={() => runSceneJson.mutate({ jobId })}
                >
                  {runSceneJson.isPending ? "Running..." : "Run Scene JSON"}
                </Button>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Editable Scene JSON</span>
                <textarea
                  className="min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                  value={sceneJsonText}
                  onChange={(event) => setSceneJsonText(event.target.value)}
                />
              </label>
              <Button
                disabled={
                  updateSceneJson.isPending || sceneJsonText.trim().length === 0
                }
                onClick={() =>
                  updateSceneJson.mutate({
                    jobId,
                    sceneJson: sceneJsonText,
                  })
                }
              >
                {updateSceneJson.isPending ? "Saving..." : "Save Scene JSON"}
              </Button>
              {runSceneJson.error ? (
                <p className="text-sm text-destructive">
                  {getErrorMessage(runSceneJson.error)}
                </p>
              ) : null}
              {updateSceneJson.error ? (
                <p className="text-sm text-destructive">
                  {getErrorMessage(updateSceneJson.error)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeView === "assets" ? (
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Asset Coverage</p>
                <p className="mt-1 text-muted-foreground">
                  {readyAssetCount}/{detail?.assets.length ?? 0} scenes have at
                  least one generated asset
                </p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Render Path</p>
                <p className="mt-1 text-muted-foreground">
                  scene package {"->"} asset validation {"->"} renderer {"->"}{" "}
                  review/publish
                </p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Fallback Strategy</p>
                <p className="mt-1 text-muted-foreground">
                  video fail {"->"} image fallback / TTS fail {"->"} alternate
                  provider
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(detail?.assets ?? []).map((asset) => (
                <div
                  key={asset.sceneId}
                  className="rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">Scene {asset.sceneId}</p>
                  <p className="mt-1 text-muted-foreground">
                    image {asset.imageS3Key ? "ready" : "pending"} / video{" "}
                    {asset.videoClipS3Key ? "ready" : "pending"} / voice{" "}
                    {asset.voiceS3Key ? "ready" : "pending"}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={runAssetGeneration.isPending}
                onClick={() => runAssetGeneration.mutate({ jobId })}
              >
                {runAssetGeneration.isPending
                  ? "Generating..."
                  : "Run Asset Generation"}
              </Button>
            </div>
            {runAssetGeneration.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(runAssetGeneration.error)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeView === "uploads" ? (
        <Card>
          <CardHeader>
            <CardTitle>Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Publish Mode</p>
                <p className="mt-1 text-muted-foreground">
                  {(contentBrief?.autoPublish ?? detail?.job.autoPublish)
                    ? "Auto publish after render"
                    : "Manual review before publish"}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Upload Status</p>
                <p className="mt-1 text-muted-foreground">
                  {detail?.job.uploadStatus ?? "not started"}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Uploaded Video ID</p>
                <p className="mt-1 text-muted-foreground">
                  {detail?.job.uploadVideoId ?? "-"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={requestUpload.isPending}
                onClick={() => requestUpload.mutate({ jobId })}
              >
                {requestUpload.isPending ? "Uploading..." : "Upload to YouTube"}
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/reviews")}
              >
                Open Review Queue
              </Button>
            </div>
            {requestUpload.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(requestUpload.error)}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              대시보드에서는 업로드 병목만 감지하고, 실제 업로드 조작은 이
              화면에서 수행합니다.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {activeView === "templates" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Production Option Tracks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {experimentOptions.map((item) => (
                <div key={item.title} className="rounded-lg border p-4 text-sm">
                  <p className="text-xs text-muted-foreground">{item.title}</p>
                  <p className="mt-1 font-medium">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.note}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variant Comparison</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {compareRows.map((row) => (
                <div key={row.label} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{row.label}</p>
                  <p className="mt-1 text-muted-foreground">{row.focus}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>Hook: {row.hook}</p>
                    <p>Renderer: {row.renderer}</p>
                    <p>Score: {row.score}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeView === "logs" ? (
        <Card>
          <CardHeader>
            <CardTitle>Operational Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {logs.map((item) => (
              <div key={item.label} className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-medium">{item.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.note}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
