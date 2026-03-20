'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useState } from 'react';

import { CompareRow } from '../model';

type ContentJobDetailSceneBuildPanelProps = {
  compareRows: CompareRow[];
  initialValue: string;
  runError: unknown;
  saveError: unknown;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onSave: (value: string) => void;
};

export function ContentJobDetailSceneBuildPanel({
  compareRows,
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
        <CardTitle>Scene Build</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {compareRows.map((row) => (
            <div key={row.label} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{row.label}</p>
              <p className="mt-1 text-muted-foreground">{row.focus}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>Hook: {row.hook}</p>
                <p>Renderer: {row.renderer}</p>
                <p>Score: {row.score}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={isRunning} onClick={onRun}>
            {isRunning ? 'Running...' : 'Run Scene JSON'}
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
          disabled={isSaving || sceneJsonText.trim().length === 0}
          onClick={() => onSave(sceneJsonText)}
        >
          {isSaving ? 'Saving...' : 'Save Scene JSON'}
        </Button>
        {runError ? <p className="text-sm text-destructive">{getErrorMessage(runError)}</p> : null}
        {saveError ? (
          <p className="text-sm text-destructive">{getErrorMessage(saveError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
