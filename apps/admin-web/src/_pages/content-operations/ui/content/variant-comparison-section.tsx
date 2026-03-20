"use client";

import { Badge } from "@packages/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import type { CompareCandidate } from "../../model";
import { formatStatusLabel } from "../../model";

type Props = {
  compareCandidates: CompareCandidate[];
};

export function VariantComparisonSection({ compareCandidates }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant Comparison</CardTitle>
        <CardDescription>
          같은 콘텐츠 라인 안에서 현재 보이는 variant들을 빠르게 비교합니다.
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
            비교할 variant가 아직 없습니다. 먼저 채널/콘텐츠 안에서 잡을 여러 개
            생성하세요.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
