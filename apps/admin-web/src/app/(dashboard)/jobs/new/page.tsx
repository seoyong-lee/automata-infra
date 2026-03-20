"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateDraftJobMutation } from "@packages/graphql";
import { Card, CardContent, CardHeader, CardTitle } from "@packages/ui/card";
import { Input } from "@packages/ui/input";
import { Button } from "@packages/ui/button";
import { getErrorMessage } from "@packages/utils";

type DraftForm = {
  channelId: string;
  targetLanguage: string;
  titleIdea: string;
  targetDurationSec: string;
  stylePreset: string;
};

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<DraftForm>({
    channelId: "history-en",
    targetLanguage: "en",
    titleIdea: "",
    targetDurationSec: "45",
    stylePreset: "dark_ambient_story",
  });

  const mutation = useCreateDraftJobMutation({
    onSuccess: ({ createDraftJob }) => {
      router.push(`/jobs/${createDraftJob.jobId}`);
    },
  });

  const onInput =
    (key: keyof DraftForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Draft Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Channel ID</span>
              <Input value={form.channelId} onChange={onInput("channelId")} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Target Language</span>
              <Input
                value={form.targetLanguage}
                onChange={onInput("targetLanguage")}
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Title Idea</span>
              <Input value={form.titleIdea} onChange={onInput("titleIdea")} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Target Duration Sec</span>
              <Input
                type="number"
                value={form.targetDurationSec}
                onChange={onInput("targetDurationSec")}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Style Preset</span>
              <Input
                value={form.stylePreset}
                onChange={onInput("stylePreset")}
              />
            </label>
          </div>
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                channelId: form.channelId,
                targetLanguage: form.targetLanguage,
                titleIdea: form.titleIdea,
                targetDurationSec: Number(form.targetDurationSec),
                stylePreset: form.stylePreset,
              })
            }
          >
            {mutation.isPending ? "Creating..." : "Create Draft"}
          </Button>
          {mutation.error ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(mutation.error)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
