"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import type { ExperimentTrack } from "../../model";

type Props = {
  experimentTracks: ExperimentTrack[];
};

export function OptionLabSection({ experimentTracks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Option Lab</CardTitle>
        <CardDescription>
          콘텐츠 라인별로 실험 중인 제작 옵션 축을 정리합니다.
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
  );
}
