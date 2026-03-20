"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useJobDraftQuery,
  useRequestUploadMutation,
  useRunAssetGenerationMutation,
  useRunSceneJsonMutation,
  useRunTopicPlanMutation,
  useUpdateSceneJsonMutation,
  useUpdateTopicSeedMutation,
} from "@packages/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { Input } from "@packages/ui/input";
import { Button } from "@packages/ui/button";
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";

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

export default function JobDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? "";
  const detailQuery = useJobDraftQuery({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data;
  const contentBrief = detail?.contentBrief;

  const [seedForm, setSeedForm] = useState<SeedForm>(() => toSeedForm());
  const [sceneJsonText, setSceneJsonText] = useState<string>("");

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
        value: readyAssetCount > 0 ? "asset-first orchestration" : "awaiting assets",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Job Detail</CardTitle>
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
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link className="text-sm text-primary hover:underline" href="/jobs">
            Back to Content Manager
          </Link>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            선택한 콘텐츠 탭 내부에서 스크립트, 장면, 에셋, 업로드를 운영하는
            세부 잡 관리 화면입니다.
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <CardTitle>Production Option Tracks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experimentOptions.map((item) => (
            <div key={item.title} className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-medium">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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
          <CardTitle>Script + Scene Build</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle>Image / Video / Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Asset Coverage</p>
              <p className="mt-1 text-muted-foreground">
                {readyAssetCount}/{detail?.assets.length ?? 0} scenes have at least one
                generated asset
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Render Path</p>
              <p className="mt-1 text-muted-foreground">
                scene package {"->"} asset validation {"->"} renderer {"->"} review/publish
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Fallback Strategy</p>
              <p className="mt-1 text-muted-foreground">
                video fail {"->"} image fallback / TTS fail {"->"} alternate provider
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(detail?.assets ?? []).slice(0, 3).map((asset) => (
              <div
                key={asset.sceneId}
                className="rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">Scene {asset.sceneId}</p>
                <p className="mt-1 text-muted-foreground">
                  image {asset.imageS3Key ? "ready" : "pending"} / voice{" "}
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
          {runAssetGeneration.error ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(runAssetGeneration.error)}
            </p>
          ) : null}
          {requestUpload.error ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(requestUpload.error)}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            이 단계에서는 전체 재생성보다 특정 scene, TTS, visual만 다시
            생성하는 흐름이 우선입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
