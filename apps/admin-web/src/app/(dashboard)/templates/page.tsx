"use client";

import { Badge } from "@packages/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/card";
import { Button } from "@packages/ui/button";

const templates = [
  {
    id: "daily-saju-ko-v1",
    title: "Daily Saju KO v1",
    description:
      "Mystic daily fortune recipe with 5-scene layout and calm narration.",
    status: "active",
    jobs: 14,
    performance: "CTR +12%",
  },
  {
    id: "daily-saju-ko-mystic-v2",
    title: "Daily Saju KO Mystic v2",
    description:
      "Hook-forward variation with stronger CTA and darker visual preset.",
    status: "draft",
    jobs: 6,
    performance: "testing",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              좋은 실험 결과를 생산 레시피로 승격하고 관리합니다.
            </CardDescription>
          </div>
          <Button variant="secondary">Run test generation</Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={template.status === "active" ? "default" : "outline"}
                >
                  {template.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {template.performance}
                </span>
              </div>
              <div>
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription className="mt-1">
                  {template.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">
                    Jobs from template
                  </p>
                  <p>{template.jobs}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Version</p>
                  <p>{template.id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-muted px-2 py-1">
                  Fork template
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  Set active
                </span>
                <span className="rounded-md bg-muted px-2 py-1">Archive</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
