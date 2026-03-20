"use client";

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

export default function JobDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? "";
  const detailQuery = useJobDraftQuery({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data;

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Job ID: {jobId}</p>
          <p>Status: {detail?.job.status ?? "-"}</p>
          <p>Scenes: {sceneCount}</p>
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
          <CardTitle>Topic Seed</CardTitle>
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
          <CardTitle>Scene JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle>Asset Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
              {requestUpload.isPending ? "Queuing..." : "Request Upload"}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/reviews")}
            >
              Open Reviews
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
            자산 생성 후 기존 리뷰/업로드 흐름은 리뷰 화면에서 이어서
            진행합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
