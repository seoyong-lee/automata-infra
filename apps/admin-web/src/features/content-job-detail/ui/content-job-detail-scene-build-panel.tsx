'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { SceneJsonPayload } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useEffect, useMemo, useState } from 'react';

type ContentJobDetailSceneBuildPanelProps = {
  initialValue: string;
  runError: unknown;
  saveError: unknown;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onSave: (value: string) => void;
};

function tryParseSceneJson(text: string): { ok: true; data: SceneJsonPayload } | { ok: false } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as SceneJsonPayload).scenes) &&
      typeof (parsed as SceneJsonPayload).videoTitle === 'string'
    ) {
      return { ok: true, data: parsed as SceneJsonPayload };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

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

  useEffect(() => {
    setSceneJsonText(initialValue);
  }, [initialValue]);

  const parsed = useMemo(() => tryParseSceneJson(sceneJsonText), [sceneJsonText]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>씬 설계</CardTitle>
          <CardDescription>
            기본은 구조화된 요약입니다. 세부 수정은{' '}
            <strong className="text-foreground">고급 · Raw JSON</strong>에서 하세요. 후보·채택
            모델은 추후 이 탭에 합류합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={isRunning} onClick={onRun}>
              {isRunning ? '실행 중…' : 'Scene JSON 생성'}
            </Button>
            <Button
              disabled={isSaving || sceneJsonText.trim().length === 0}
              onClick={() => onSave(sceneJsonText)}
            >
              {isSaving ? '저장 중…' : '저장 (현재 JSON)'}
            </Button>
          </div>

          {parsed.ok ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">영상 제목</span>{' '}
                  <span className="font-medium">{parsed.data.videoTitle}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">언어</span>{' '}
                  <span className="font-medium">{parsed.data.language}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">씬 수</span>{' '}
                  <span className="font-medium">{parsed.data.scenes.length}</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="py-2 pr-2 font-medium">길이(초)</th>
                      <th className="py-2 pr-2 font-medium">나레이션</th>
                      <th className="py-2 font-medium">이미지 프롬프트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.data.scenes.map((s) => (
                      <tr key={s.sceneId} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-2 font-mono text-xs">{s.sceneId}</td>
                        <td className="py-2 pr-2 tabular-nums">{s.durationSec}</td>
                        <td className="max-w-[14rem] py-2 pr-2 text-xs leading-snug">
                          <span className="line-clamp-3">{s.narration}</span>
                        </td>
                        <td className="max-w-[18rem] py-2 text-xs leading-snug text-muted-foreground">
                          <span className="line-clamp-2">{s.imagePrompt}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              {sceneJsonText.trim()
                ? '유효한 Scene JSON이 아닙니다. 생성을 실행하거나 고급 편집에서 형식을 맞춰 주세요.'
                : '아직 Scene JSON이 없습니다. 생성을 실행하세요.'}
            </p>
          )}

          {runError ? (
            <p className="text-sm text-destructive">{getErrorMessage(runError)}</p>
          ) : null}
          {saveError ? (
            <p className="text-sm text-destructive">{getErrorMessage(saveError)}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">고급 · Raw JSON</CardTitle>
          <CardDescription>
            구조화 뷰와 동일한 내용입니다. 직접 편집 후 위의 &quot;저장&quot;을 누르세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={sceneJsonText}
            onChange={(event) => setSceneJsonText(event.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
