"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  useAdminJobsQuery,
  useCreateDraftJobMutation,
  useJobDraftQuery,
  useLlmSettingsQuery,
  useRunAssetGenerationMutation,
  useRunSceneJsonMutation,
  useRunTopicPlanMutation,
  useUpdateTopicSeedMutation,
} from "@packages/graphql";
import { Badge } from "@packages/ui/badge";
import { Button } from "@packages/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import { Input } from "@packages/ui/input";
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";

type WorkbenchForm = {
  contentType: string;
  channelId: string;
  targetLanguage: string;
  targetDurationSec: string;
  titleIdea: string;
  tone: string;
  stylePreset: string;
  hookStrength: string;
  sceneCount: string;
  visualPreset: string;
  voicePreset: string;
  promptVersion: string;
  seed: string;
};

const defaultForm: WorkbenchForm = {
  contentType: "daily-saju-fortune",
  channelId: "history-en",
  targetLanguage: "en",
  targetDurationSec: "35",
  titleIdea: "",
  tone: "calm_direct",
  stylePreset: "dark_ambient_story",
  hookStrength: "medium",
  sceneCount: "5",
  visualPreset: "mystic_ambient",
  voicePreset: "narration-default",
  promptVersion: "v1",
  seed: "",
};

const buildVariantLabel = (index: number): string => {
  return (
    ["Variant A", "Variant B", "Variant C"][index] ?? `Variant ${index + 1}`
  );
};

const estimateCost = (sceneCount: number, status: string): string => {
  const multiplier =
    status === "ASSETS_READY"
      ? 0.06
      : status === "SCENE_JSON_READY"
        ? 0.03
        : 0.01;
  return `$${(0.02 + sceneCount * multiplier).toFixed(2)}`;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const jobs = useAdminJobsQuery({ limit: 12 });
  const llmSettings = useLlmSettingsQuery();
  const [form, setForm] = useState<WorkbenchForm>(defaultForm);
  const variants = useMemo(
    () => (jobs.data?.items ?? []).slice(0, 3),
    [jobs.data],
  );
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const selectedVariant =
    variants.find((item) => item.jobId === selectedJobId) ??
    variants[0] ??
    null;
  const selectedDetail = useJobDraftQuery(
    { jobId: selectedVariant?.jobId ?? "" },
    { enabled: Boolean(selectedVariant?.jobId) },
  );

  useEffect(() => {
    if (!selectedJobId && variants[0]?.jobId) {
      setSelectedJobId(variants[0].jobId);
    }
  }, [selectedJobId, variants]);

  const refresh = async (jobId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    if (jobId) {
      await queryClient.invalidateQueries({ queryKey: ["jobDraft", jobId] });
    }
  };

  const createDraft = useCreateDraftJobMutation({
    onSuccess: async ({ createDraftJob }) => {
      setSelectedJobId(createDraftJob.jobId);
      await refresh(createDraftJob.jobId);
    },
  });
  const updateSeed = useUpdateTopicSeedMutation({
    onSuccess: async (_data, vars) => refresh(vars.jobId),
  });
  const runTopicPlan = useRunTopicPlanMutation({
    onSuccess: async ({ runTopicPlan }) => refresh(runTopicPlan.jobId),
  });
  const runSceneJson = useRunSceneJsonMutation({
    onSuccess: async ({ runSceneJson }) => refresh(runSceneJson.jobId),
  });
  const runAssetGeneration = useRunAssetGenerationMutation({
    onSuccess: async ({ runAssetGeneration }) =>
      refresh(runAssetGeneration.jobId),
  });

  const onInput =
    (key: keyof WorkbenchForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const persistSeed = async (): Promise<string | null> => {
    const currentJobId = selectedVariant?.jobId;
    if (!currentJobId) {
      return null;
    }
    await updateSeed.mutateAsync({
      jobId: currentJobId,
      channelId: form.channelId,
      targetLanguage: form.targetLanguage,
      titleIdea: form.titleIdea,
      targetDurationSec: Number(form.targetDurationSec),
      stylePreset: form.stylePreset,
    });
    return currentJobId;
  };

  const generateBrief = async () => {
    await createDraft.mutateAsync({
      channelId: form.channelId,
      targetLanguage: form.targetLanguage,
      contentType: "dashboard-draft",
      variant: "v1",
      titleIdea: form.titleIdea,
      targetDurationSec: Number(form.targetDurationSec),
      stylePreset: form.stylePreset,
      autoPublish: false,
    });
  };

  const generateSceneJson = async () => {
    const jobId = (await persistSeed()) ?? selectedVariant?.jobId;
    if (!jobId) {
      return;
    }
    await runTopicPlan.mutateAsync({ jobId });
    await runSceneJson.mutateAsync({ jobId });
  };

  const generateFullPreview = async () => {
    const jobId = (await persistSeed()) ?? selectedVariant?.jobId;
    if (!jobId) {
      return;
    }
    await runTopicPlan.mutateAsync({ jobId });
    await runSceneJson.mutateAsync({ jobId });
    await runAssetGeneration.mutateAsync({ jobId });
  };

  const inspector = selectedDetail.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workbench</CardTitle>
          <CardDescription>
            아이디어를 빠르게 시안으로 바꾸고, 비교하고, 일부만 다시 생성하는
            실험실입니다.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Input Panel</CardTitle>
            <CardDescription>
              콘텐츠 타입, 톤, 스타일, provider 조합을 조절해 실험합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Content Type</span>
                <Input
                  value={form.contentType}
                  onChange={onInput("contentType")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Channel</span>
                <Input value={form.channelId} onChange={onInput("channelId")} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Language</span>
                <Input
                  value={form.targetLanguage}
                  onChange={onInput("targetLanguage")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Target Duration</span>
                <Input
                  type="number"
                  value={form.targetDurationSec}
                  onChange={onInput("targetDurationSec")}
                />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Topic / Date</span>
                <Input value={form.titleIdea} onChange={onInput("titleIdea")} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Tone</span>
                <Input value={form.tone} onChange={onInput("tone")} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Style</span>
                <Input
                  value={form.stylePreset}
                  onChange={onInput("stylePreset")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Hook Strength</span>
                <Input
                  value={form.hookStrength}
                  onChange={onInput("hookStrength")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Scene Count</span>
                <Input
                  value={form.sceneCount}
                  onChange={onInput("sceneCount")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Visual Preset</span>
                <Input
                  value={form.visualPreset}
                  onChange={onInput("visualPreset")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Voice Preset</span>
                <Input
                  value={form.voicePreset}
                  onChange={onInput("voicePreset")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Prompt Version</span>
                <Input
                  value={form.promptVersion}
                  onChange={onInput("promptVersion")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Seed</span>
                <Input value={form.seed} onChange={onInput("seed")} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={createDraft.isPending} onClick={generateBrief}>
                {createDraft.isPending ? "Generating..." : "Generate Brief"}
              </Button>
              <Button
                variant="secondary"
                disabled={runSceneJson.isPending || runTopicPlan.isPending}
                onClick={generateSceneJson}
              >
                Generate Scene JSON
              </Button>
              <Button
                variant="secondary"
                disabled={
                  runSceneJson.isPending ||
                  runTopicPlan.isPending ||
                  runAssetGeneration.isPending
                }
                onClick={generateFullPreview}
              >
                Generate Full Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/templates")}
              >
                Save as Template
              </Button>
            </div>
            {createDraft.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(createDraft.error)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variant Compare</CardTitle>
            <CardDescription>
              최근 시안 3개를 한 화면에서 비교하고 다음 액션을 고릅니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading variants...
              </p>
            ) : null}
            {jobs.error ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(jobs.error)}
              </p>
            ) : null}
            <div className="grid gap-4">
              {variants.map((job, index) => {
                const sceneCount = inspector?.sceneJson?.scenes.length ?? 5;
                const isSelected = selectedVariant?.jobId === job.jobId;
                return (
                  <button
                    key={job.jobId}
                    type="button"
                    onClick={() => setSelectedJobId(job.jobId)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {buildVariantLabel(index)}
                          </Badge>
                          <Badge variant="secondary">{job.status}</Badge>
                        </div>
                        <p className="font-medium">{job.videoTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.jobId}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Scene count: {sceneCount}</p>
                        <p>Est. cost: {estimateCost(sceneCount, job.status)}</p>
                        <p>Duration: {job.targetDurationSec}s</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        Open
                      </span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        Duplicate
                      </span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        Regenerate Hook
                      </span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        Regenerate Visuals
                      </span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        Promote
                      </span>
                    </div>
                  </button>
                );
              })}
              {!jobs.isLoading && variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 비교할 시안이 없습니다. 왼쪽에서 brief를 먼저 생성하세요.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspector</CardTitle>
            <CardDescription>
              선택한 variant의 상태, 모델, 비용, 실패 지점, 재생성 액션을
              확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedVariant ? (
              <>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {selectedVariant.status}
                  </p>
                  <p>
                    <span className="font-medium">Prompt Version:</span>{" "}
                    {form.promptVersion}
                  </p>
                  <p>
                    <span className="font-medium">Updated:</span>{" "}
                    {selectedVariant.updatedAt}
                  </p>
                  <p>
                    <span className="font-medium">Cost:</span>{" "}
                    {estimateCost(
                      inspector?.sceneJson?.scenes.length ?? 5,
                      selectedVariant.status,
                    )}
                  </p>
                  <p>
                    <span className="font-medium">LLM Configured Steps:</span>{" "}
                    {llmSettings.data?.length ?? 0}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <p className="font-medium">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">
                      Regenerate scene 2 only
                    </Button>
                    <Button size="sm" variant="outline">
                      Swap TTS voice
                    </Button>
                    <Button size="sm" variant="outline">
                      Change hook
                    </Button>
                    <Button size="sm" variant="outline">
                      Rebuild render plan
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <p className="font-medium">Next Step</p>
                  <div className="flex flex-col gap-2">
                    <Link
                      className="text-primary hover:underline"
                      href={`/jobs/${selectedVariant.jobId}`}
                    >
                      Open full job detail
                    </Link>
                    <Link
                      className="text-primary hover:underline"
                      href="/reviews"
                    >
                      Send to review queue
                    </Link>
                    <Link
                      className="text-primary hover:underline"
                      href="/templates"
                    >
                      Promote to template
                    </Link>
                  </div>
                </div>
                {selectedDetail.error ? (
                  <p className="text-sm text-destructive">
                    {getErrorMessage(selectedDetail.error)}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                선택된 variant가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
