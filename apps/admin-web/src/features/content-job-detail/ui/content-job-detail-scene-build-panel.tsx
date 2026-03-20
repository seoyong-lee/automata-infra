'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useState } from 'react';

type ContentJobDetailSceneBuildPanelProps = {
  initialValue: string;
  runError: unknown;
  saveError: unknown;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onSave: (value: string) => void;
};

export function ContentJobDetailSceneBuildPanel({
  initialValue,
  runError,
  saveError,
  isRunning,
  isSaving,
  onRun,
  onSave,
}: ContentJobDetailSceneBuildPanelProps) {
  const [sceneJsonText, setSceneJsonText] = useState<string>(() => initialValue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>스크립트 및 JSON</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={isRunning} onClick={onRun}>
            {isRunning ? '실행 중...' : 'Scene JSON 생성'}
          </Button>
        </div>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Scene JSON</span>
          <textarea
            className="min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={sceneJsonText}
            onChange={(event) => setSceneJsonText(event.target.value)}
          />
        </label>
        <Button
          disabled={isSaving || sceneJsonText.trim().length === 0}
          onClick={() => onSave(sceneJsonText)}
        >
          {isSaving ? '저장 중...' : 'Scene JSON 저장'}
        </Button>
        {runError ? <p className="text-sm text-destructive">{getErrorMessage(runError)}</p> : null}
        {saveError ? (
          <p className="text-sm text-destructive">{getErrorMessage(saveError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
