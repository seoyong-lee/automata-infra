"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  useAdminJobsQuery,
  useRequestUploadMutation,
  useYoutubeChannelConfigsQuery,
} from "@packages/graphql";
import { Button } from "@packages/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import { getErrorMessage } from "@packages/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChannelSelectorTabs } from "@/widgets/channel-selector-tabs";
import { ContentJobsSection } from "./content/content-jobs-section";
import { ContentLineOverviewSection } from "./content/content-line-overview-section";
import { ContentLinesSection } from "./content/content-lines-section";
import {
  estimateExperimentScore,
  matchesQuickFilter,
  quickFilterMeta,
  type QuickFilterKey,
} from "../model";
import { OptionLabSection } from "./content/option-lab-section";
import { SelectedChannelSection } from "./content/selected-channel-section";
import { SelectedJobPanelSection } from "./content/selected-job-panel-section";
import { VariantComparisonSection } from "./content/variant-comparison-section";
import { useSearchParams } from "next/navigation";

function ContentOperationsPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const configuredChannelsQuery = useYoutubeChannelConfigsQuery();
  const jobsQuery = useAdminJobsQuery({ limit: 100 });
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [selectedQuickFilter, setSelectedQuickFilter] =
    useState<QuickFilterKey>("all");
  const [selectedJobId, setSelectedJobId] = useState("");
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

  useEffect(() => {
    const queryFilter = searchParams.get("filter");
    if (
      queryFilter === "review" ||
      queryFilter === "failed" ||
      queryFilter === "upload-ready" ||
      queryFilter === "all"
    ) {
      setSelectedQuickFilter(queryFilter);
    }
  }, [searchParams]);

  const contentLineJobs = useMemo(() => {
    if (selectedContentType === "all") {
      return channelJobs;
    }
    return channelJobs.filter((job) => job.contentType === selectedContentType);
  }, [channelJobs, selectedContentType]);

  const filteredJobs = useMemo(() => {
    return contentLineJobs.filter((job) =>
      matchesQuickFilter(job.status, selectedQuickFilter),
    );
  }, [contentLineJobs, selectedQuickFilter]);

  const contentCards = useMemo(() => {
    return contentTypes.map((contentType) => {
      const contentJobs = channelJobs.filter(
        (job) => job.contentType === contentType,
      );
      return {
        contentType,
        totalJobs: contentJobs.length,
        draftCount: contentJobs.filter((job) => job.status === "DRAFT").length,
        failedCount: contentJobs.filter(
          (job) => job.status === "FAILED" || job.status === "REJECTED",
        ).length,
        reviewCount: contentJobs.filter(
          (job) => job.status === "REVIEW_PENDING",
        ).length,
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

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobId("");
      return;
    }
    if (
      !selectedJobId ||
      !filteredJobs.some((job) => job.jobId === selectedJobId)
    ) {
      setSelectedJobId(filteredJobs[0]?.jobId ?? "");
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob = useMemo(
    () => filteredJobs.find((job) => job.jobId === selectedJobId) ?? null,
    [filteredJobs, selectedJobId],
  );

  const selectedChannelConfig = configuredChannels.find(
    (item) => item.channelId === selectedChannel,
  );

  const contentLineSummary = useMemo(() => {
    const latestUploadedJob = [...contentLineJobs]
      .filter((job) => job.status === "UPLOADED")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const latestUpdatedJob = [...contentLineJobs].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )[0];

    return {
      title:
        selectedContentType === "all"
          ? "All Content Lines"
          : selectedContentType,
      totalJobs: contentLineJobs.length,
      failedJobs: contentLineJobs.filter(
        (job) => job.status === "FAILED" || job.status === "REJECTED",
      ).length,
      reviewJobs: contentLineJobs.filter(
        (job) => job.status === "REVIEW_PENDING",
      ).length,
      uploadedJobs: contentLineJobs.filter((job) => job.status === "UPLOADED")
        .length,
      activeVariants: new Set(
        contentLineJobs
          .map((job) => job.variant)
          .filter((value): value is string => Boolean(value)),
      ).size,
      averageDurationSec:
        contentLineJobs.length > 0
          ? Math.round(
              contentLineJobs.reduce(
                (sum, job) => sum + job.targetDurationSec,
                0,
              ) / contentLineJobs.length,
            )
          : 0,
      latestUploadedAt: latestUploadedJob?.updatedAt ?? null,
      latestUpdatedAt: latestUpdatedJob?.updatedAt ?? null,
    };
  }, [contentLineJobs, selectedContentType]);

  const quickFilterCounts = useMemo(() => {
    return quickFilterMeta.reduce<Record<QuickFilterKey, number>>(
      (acc, item) => {
        acc[item.key] = contentLineJobs.filter((job) =>
          matchesQuickFilter(job.status, item.key),
        ).length;
        return acc;
      },
      { all: 0, review: 0, failed: 0, "upload-ready": 0 },
    );
  }, [contentLineJobs]);

  const experimentTracks = useMemo(
    () => [
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
    ],
    [],
  );

  const compareCandidates = useMemo(() => {
    return filteredJobs.slice(0, 3).map((job, index) => ({
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
    }));
  }, [filteredJobs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Content Operations</CardTitle>
            <CardDescription>
              {"채널 -> 콘텐츠 라인 -> 잡"} 순서로 진입해 실제 스크립트, 에셋,
              업로드 운영을 처리하는 작업 공간입니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedQuickFilter("failed")}
              variant="outline"
              disabled={!selectedChannel}
            >
              View Failed Jobs
            </Button>
            <Button
              onClick={() => setSelectedQuickFilter("review")}
              variant="outline"
              disabled={!selectedChannel}
            >
              Review Queue
            </Button>
            <Button
              onClick={() =>
                (window.location.href = `/jobs/new?channelId=${encodeURIComponent(selectedChannel)}${selectedContentType !== "all" ? `&contentType=${encodeURIComponent(selectedContentType)}` : ""}`)
              }
              disabled={!selectedChannel}
            >
              New Content Job
            </Button>
          </div>
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

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Channel Tabs</p>
          <p className="text-sm text-muted-foreground">
            채널 선택은 최상위 탭입니다. 아래의 모든 섹션은 현재 선택된 채널
            하위 항목으로 동작합니다.
          </p>
        </div>
        <ChannelSelectorTabs
          availableChannels={availableChannels}
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannelId}
          isLoading={jobsQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SelectedChannelSection
          selectedChannel={selectedChannel}
          selectedChannelConfig={selectedChannelConfig}
        />
        <ContentLinesSection
          contentTypes={contentTypes}
          contentCards={contentCards}
          selectedContentType={selectedContentType}
          onSelectContentType={setSelectedContentType}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <ContentLineOverviewSection
          contentLineSummary={contentLineSummary}
          quickFilterCounts={quickFilterCounts}
          selectedQuickFilter={selectedQuickFilter}
          onSelectQuickFilter={setSelectedQuickFilter}
        />
        <SelectedJobPanelSection
          selectedJob={selectedJob}
          isUploading={requestUpload.isPending}
          onUpload={(jobId) => requestUpload.mutate({ jobId })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <OptionLabSection experimentTracks={experimentTracks} />
        <VariantComparisonSection compareCandidates={compareCandidates} />
      </div>

      <ContentJobsSection
        filteredJobs={filteredJobs}
        isLoading={jobsQuery.isLoading}
        selectedJobId={selectedJobId}
        onSelectJob={setSelectedJobId}
        isUploading={requestUpload.isPending}
        onUpload={(jobId) => requestUpload.mutate({ jobId })}
      />
    </div>
  );
}

export function ContentOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Operations</CardTitle>
              <CardDescription>
                Loading channel tabs and content filters...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <ContentOperationsPageContent />
    </Suspense>
  );
}
