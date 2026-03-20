"use client";

import type { AdminJob } from "@packages/graphql";
import { Badge } from "@packages/ui/badge";
import { Button } from "@packages/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import Link from "next/link";
import { estimateExperimentScore, formatStatusLabel } from "../../model";

type Props = {
  selectedJob: AdminJob | null;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function SelectedJobPanelSection({
  selectedJob,
  isUploading,
  onUpload,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Job Panel</CardTitle>
        <CardDescription>
          선택한 잡의 상태와 다음 액션을 우측 패널에서 바로 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedJob ? (
          <>
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedJob.channelId}</Badge>
                    {selectedJob.contentType ? (
                      <Badge variant="secondary">
                        {selectedJob.contentType}
                      </Badge>
                    ) : null}
                    <Badge>{formatStatusLabel(selectedJob.status)}</Badge>
                  </div>
                  <p className="font-medium">{selectedJob.videoTitle}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedJob.jobId}
                  </p>
                </div>
                <div className="grid gap-3 text-right text-xs text-muted-foreground md:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Variant</p>
                    <p>{selectedJob.variant ?? "-"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Duration</p>
                    <p>{selectedJob.targetDurationSec}s</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Retry</p>
                    <p>{selectedJob.retryCount}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Updated</p>
                    <p>{selectedJob.updatedAt}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/jobs/${selectedJob.jobId}`}
                >
                  Open Deep Workspace
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => onUpload(selectedJob.jobId)}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="mt-1 font-medium">
                  {selectedJob.status === "UPLOADED" ||
                  selectedJob.status === "RENDERED"
                    ? "scene package -> shotstack"
                    : "scene package -> assets -> render"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Publish mode</p>
                <p className="mt-1 font-medium">
                  {selectedJob.autoPublish ? "Auto publish" : "Needs review"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-xs text-muted-foreground">Estimated score</p>
                <p className="mt-1 font-medium">
                  {estimateExperimentScore({
                    status: selectedJob.status,
                    autoPublish: selectedJob.autoPublish,
                    retryCount: selectedJob.retryCount,
                  })}
                </p>
              </div>
            </div>
          </>
        ) : null}
        {!selectedJob ? (
          <p className="text-sm text-muted-foreground">
            현재 선택된 필터에 맞는 잡이 없습니다. 다른 콘텐츠 라인이나 필터를
            선택해 보세요.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
