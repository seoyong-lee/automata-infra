"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAdminJobsQuery,
  useRequestUploadMutation,
  useYoutubeChannelConfigsQuery,
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
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";

const formatStatusLabel = (status: string) => {
  return status.toLowerCase().replace(/_/g, " ");
};

const estimateExperimentScore = (input: {
  status: string;
  autoPublish?: boolean | null;
  retryCount: number;
}) => {
  const statusScore =
    input.status === "UPLOADED"
      ? 95
      : input.status === "RENDERED"
        ? 82
        : input.status === "ASSETS_READY"
          ? 74
          : input.status === "SCENE_JSON_READY"
            ? 63
            : 48;
  const publishBonus = input.autoPublish ? 4 : 0;
  const retryPenalty = input.retryCount * 3;
  return Math.max(0, statusScore + publishBonus - retryPenalty);
};

function JobsPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const configuredChannelsQuery = useYoutubeChannelConfigsQuery();
  const jobsQuery = useAdminJobsQuery({ limit: 100 });
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const requestUpload = useRequestUploadMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    },
  });

  const jobs = jobsQuery.data?.items ?? [];
  const configuredChannels = configuredChannelsQuery.data ?? [];

  const availableChannels = useMemo(() => {
    return Array.from(
      new Set([
        ...configuredChannels.map((item) => item.channelId),
        ...jobs.map((item) => item.channelId),
      ]),
    ).sort();
  }, [configuredChannels, jobs]);

  useEffect(() => {
    const queryChannelId = searchParams.get("channelId");
    if (queryChannelId && availableChannels.includes(queryChannelId)) {
      setSelectedChannelId(queryChannelId);
      return;
    }
    if (!selectedChannelId && availableChannels[0]) {
      setSelectedChannelId(availableChannels[0]);
    }
  }, [availableChannels, searchParams, selectedChannelId]);

  const selectedChannel = selectedChannelId || availableChannels[0] || "";

  const channelJobs = useMemo(() => {
    return jobs.filter((job) => job.channelId === selectedChannel);
  }, [jobs, selectedChannel]);

  const contentTypes = useMemo(() => {
    return Array.from(
      new Set(
        channelJobs
          .map((job) => job.contentType)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [channelJobs]);

  useEffect(() => {
    const queryContentType = searchParams.get("contentType");
    if (queryContentType && contentTypes.includes(queryContentType)) {
      setSelectedContentType(queryContentType);
      return;
    }
    if (
      selectedContentType !== "all" &&
      !contentTypes.includes(selectedContentType)
    ) {
      setSelectedContentType("all");
    }
  }, [contentTypes, searchParams, selectedContentType]);

  const filteredJobs = useMemo(() => {
    if (selectedContentType === "all") {
      return channelJobs;
    }
    return channelJobs.filter((job) => job.contentType === selectedContentType);
  }, [channelJobs, selectedContentType]);

  const contentCards = useMemo(() => {
    return contentTypes.map((contentType) => {
      const contentJobs = channelJobs.filter(
        (job) => job.contentType === contentType,
      );
      return {
        contentType,
        totalJobs: contentJobs.length,
        draftCount: contentJobs.filter((job) => job.status === "DRAFT").length,
        assetReadyCount: contentJobs.filter(
          (job) =>
            job.status === "ASSETS_READY" ||
            job.status === "RENDERED" ||
            job.status === "UPLOADED",
        ).length,
        uploadReadyCount: contentJobs.filter(
          (job) => job.status === "RENDERED" || job.status === "APPROVED",
        ).length,
      };
    });
  }, [channelJobs, contentTypes]);

  const selectedChannelConfig = configuredChannels.find(
    (item) => item.channelId === selectedChannel,
  );

  const experimentTracks = useMemo(() => {
    return [
      {
        key: "scene-package",
        title: "Scene Package",
        description:
          "structured script -> scene timeline -> editable scene JSON",
        options: ["headline-top", "fact-card", "caption-heavy"],
      },
      {
        key: "assets",
        title: "Asset Strategy",
        description: "bg video / bg image fallback / TTS / caption style mix",
        options: ["video-first", "image-fallback", "tts-balanced"],
      },
      {
        key: "renderer",
        title: "Renderer",
        description:
          "renderer abstraction behind the same scene package contract",
        options: ["shotstack-mvp", "ffmpeg-spike", "hybrid-review"],
      },
      {
        key: "review",
        title: "Review / Publish",
        description:
          "review-first, light rerender, full rerender, manual vs auto publish",
        options: ["review-first", "light-rerender", "auto-publish"],
      },
    ];
  }, []);

  const compareCandidates = useMemo(() => {
    return filteredJobs.slice(0, 3).map((job, index) => {
      return {
        job,
        label:
          job.variant ||
          ["variant-a", "variant-b", "variant-c"][index] ||
          "variant",
        score: estimateExperimentScore({
          status: job.status,
          autoPublish: job.autoPublish,
          retryCount: job.retryCount,
        }),
        renderPath:
          job.status === "UPLOADED" || job.status === "RENDERED"
            ? "scene-package -> shotstack"
            : "scene-package -> assets -> render",
      };
    });
  }, [filteredJobs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Content Manager</CardTitle>
            <CardDescription>
              먼저 유튜브 채널 단위 탭을 선택하고, 그 안에서 콘텐츠별 스크립트,
              영상, 이미지 생성과 업로드를 관리합니다.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              (window.location.href = `/jobs/new?channelId=${encodeURIComponent(selectedChannel)}${selectedContentType !== "all" ? `&contentType=${encodeURIComponent(selectedContentType)}` : ""}`)
            }
            disabled={!selectedChannel}
          >
            New Content Job
          </Button>
        </CardHeader>
      </Card>

      {jobsQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(jobsQuery.error)}
        </p>
      ) : null}
      {configuredChannelsQuery.error ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(configuredChannelsQuery.error)}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Channel Tabs</CardTitle>
          <CardDescription>
            콘텐츠 관리의 시작점은 유튜브 채널입니다. 채널을 먼저 선택한 뒤 해당
            콘텐츠와 잡 흐름을 운영합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {availableChannels.map((channelId) => (
            <Button
              key={channelId}
              variant={channelId === selectedChannel ? "default" : "outline"}
              onClick={() => setSelectedChannelId(channelId)}
            >
              {channelId}
            </Button>
          ))}
          {!jobsQuery.isLoading && availableChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 선택 가능한 채널이 없습니다. 먼저 Settings에서 유튜브 채널을
              추가하세요.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Selected Channel</CardTitle>
            <CardDescription>
              채널별 기본 업로드 정책과 현재 운영 중인 콘텐츠 흐름을 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{selectedChannel || "-"}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Auto publish</p>
                  <p>
                    {selectedChannelConfig?.autoPublishEnabled
                      ? "enabled"
                      : "review first"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visibility</p>
                  <p>{selectedChannelConfig?.defaultVisibility ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Playlist</p>
                  <p>{selectedChannelConfig?.playlistId ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Secret</p>
                  <p>{selectedChannelConfig?.youtubeSecretName ?? "-"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              채널 탭 내부에서 콘텐츠 타입별 잡을 나눠 운영하고, 상세 화면에서
              스크립트, 장면, 에셋, 업로드를 이어서 관리합니다.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Types</CardTitle>
            <CardDescription>
              선택한 채널 안에서 콘텐츠 타입별 잡 흐름을 나눠 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedContentType === "all" ? "default" : "outline"}
                onClick={() => setSelectedContentType("all")}
              >
                All Content
              </Button>
              {contentTypes.map((contentType) => (
                <Button
                  key={contentType}
                  variant={
                    selectedContentType === contentType ? "default" : "outline"
                  }
                  onClick={() => setSelectedContentType(contentType)}
                >
                  {contentType}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {contentCards.map((card) => (
                <button
                  key={card.contentType}
                  type="button"
                  className={`rounded-lg border p-4 text-left ${
                    selectedContentType === card.contentType
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/40"
                  }`}
                  onClick={() => setSelectedContentType(card.contentType)}
                >
                  <p className="font-medium">{card.contentType}</p>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>Total jobs: {card.totalJobs}</p>
                    <p>Drafts: {card.draftCount}</p>
                    <p>Assets ready: {card.assetReadyCount}</p>
                    <p>Upload ready: {card.uploadReadyCount}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Option Lab</CardTitle>
            <CardDescription>
              영상 제작 옵션을 축별로 나눠 개발하고, 동일 콘텐츠에서 결과를
              비교할 수 있도록 구성한 실험 영역입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {experimentTracks.map((track) => (
              <div key={track.key} className="rounded-lg border p-4">
                <p className="font-medium">{track.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {track.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.options.map((option) => (
                    <span
                      key={option}
                      className="rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variant Comparison</CardTitle>
            <CardDescription>
              같은 콘텐츠 안에서 옵션 조합과 결과를 빠르게 비교하는
              테이블입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {compareCandidates.map((candidate) => (
              <div
                key={candidate.job.jobId}
                className="rounded-lg border p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{candidate.label}</Badge>
                      <Badge variant="secondary">
                        {formatStatusLabel(candidate.job.status)}
                      </Badge>
                    </div>
                    <p className="font-medium">{candidate.job.videoTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.renderPath}
                    </p>
                  </div>
                  <div className="grid gap-2 text-right text-xs text-muted-foreground md:grid-cols-3">
                    <div>
                      <p className="font-medium text-foreground">Score</p>
                      <p>{candidate.score}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Duration</p>
                      <p>{candidate.job.targetDurationSec}s</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Publish</p>
                      <p>{candidate.job.autoPublish ? "auto" : "review"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {compareCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                비교할 variant가 아직 없습니다. 먼저 채널/콘텐츠 안에서 잡을
                여러 개 생성하세요.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Jobs</CardTitle>
          <CardDescription>
            콘텐츠 탭 내부에서 실제 스크립트, 이미지, 영상, 업로드 단위 잡을
            관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading content jobs...
            </p>
          ) : null}

          {filteredJobs.map((job) => (
            <div key={job.jobId} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{job.status}</Badge>
                    {job.contentType ? (
                      <Badge variant="secondary">{job.contentType}</Badge>
                    ) : null}
                    {job.variant ? (
                      <span className="text-xs text-muted-foreground">
                        {job.variant}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-medium">{job.videoTitle}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {job.jobId}
                  </p>
                </div>

                <div className="grid gap-3 text-right text-xs text-muted-foreground md:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Duration</p>
                    <p>{job.targetDurationSec}s</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Publish</p>
                    <p>{job.autoPublish ? "auto" : "manual"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Retry</p>
                    <p>{job.retryCount}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Updated</p>
                    <p>{job.updatedAt}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  script
                </span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  image
                </span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  video
                </span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  upload
                </span>
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/jobs/${job.jobId}`}
                >
                  Open content detail
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={requestUpload.isPending}
                  onClick={() => requestUpload.mutate({ jobId: job.jobId })}
                >
                  {requestUpload.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          ))}

          {!jobsQuery.isLoading && filteredJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              선택한 채널/콘텐츠에 아직 잡이 없습니다.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Manager</CardTitle>
              <CardDescription>
                Loading channel tabs and content filters...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}
