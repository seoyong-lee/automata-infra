'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { SceneJsonPayload } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import { useEffect, useMemo, useState } from 'react';

type ContentJobDetailSceneBuildPanelProps = {
  initialValue: string;
  previewAssets?: Array<{
    sceneId: number;
    imagePreviewUrl?: string;
    videoPreviewUrl?: string;
  }>;
  runError: unknown;
  saveError: unknown;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onSave: (value: string) => void;
};

function setSceneSubtitle(text: string, sceneId: number, subtitle: string): string {
  const parsed = JSON.parse(text) as SceneJsonPayload;
  return JSON.stringify(
    {
      ...parsed,
      scenes: parsed.scenes.map((scene) =>
        scene.sceneId === sceneId ? { ...scene, subtitle } : scene,
      ),
    },
    null,
    2,
  );
}

function setSceneDisableNarration(
  text: string,
  sceneId: number,
  disableNarration: boolean,
): string {
  const parsed = JSON.parse(text) as SceneJsonPayload;
  return JSON.stringify(
    {
      ...parsed,
      scenes: parsed.scenes.map((scene) =>
        scene.sceneId === sceneId ? { ...scene, disableNarration } : scene,
      ),
    },
    null,
    2,
  );
}

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
  previewAssets = [],
  runError,
  saveError,
  isRunning,
  isSaving,
  onRun,
  onSave,
}: ContentJobDetailSceneBuildPanelProps) {
  const [sceneJsonText, setSceneJsonText] = useState<string>(() => initialValue);
  const [previewSceneId, setPreviewSceneId] = useState<number | null>(null);

  useEffect(() => {
    setSceneJsonText(initialValue);
  }, [initialValue]);

  const parsed = useMemo(() => tryParseSceneJson(sceneJsonText), [sceneJsonText]);
  const previewAssetBySceneId = useMemo(
    () => new Map(previewAssets.map((asset) => [asset.sceneId, asset])),
    [previewAssets],
  );
  const previewScenes = parsed.ok
    ? parsed.data.scenes.map((scene) => ({
        ...scene,
        imagePreviewUrl: previewAssetBySceneId.get(scene.sceneId)?.imagePreviewUrl,
        videoPreviewUrl: previewAssetBySceneId.get(scene.sceneId)?.videoPreviewUrl,
      }))
    : [];
  const activePreviewScene =
    previewScenes.find((scene) => scene.sceneId === previewSceneId) ?? previewScenes[0];

  useEffect(() => {
    if (!previewScenes.length) {
      if (previewSceneId !== null) {
        setPreviewSceneId(null);
      }
      return;
    }
    if (
      previewSceneId === null ||
      !previewScenes.some((scene) => scene.sceneId === previewSceneId)
    ) {
      setPreviewSceneId(previewScenes[0]?.sceneId ?? null);
    }
  }, [previewSceneId, previewScenes]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>씬 설계</CardTitle>
          <CardDescription>
            기본은 구조화된 요약입니다. 세부 수정은{' '}
            <strong className="text-foreground">고급 · Raw JSON</strong>에서 하세요. 후보·채택
            모델은 추후 이 탭에 합류합니다. `나레이션 없음`을 체크하면 음성 생성과 렌더 길이
            계산에서 제외됩니다.
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
                      <th className="py-2 pr-2 font-medium">나레이션 없음</th>
                      <th className="py-2 pr-2 font-medium">나레이션</th>
                      <th className="py-2 font-medium">이미지 프롬프트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.data.scenes.map((s) => (
                      <tr key={s.sceneId} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-2 font-mono text-xs">{s.sceneId}</td>
                        <td className="py-2 pr-2 tabular-nums">{s.durationSec}</td>
                        <td className="py-2 pr-2 text-xs">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(s.disableNarration)}
                              onChange={(event) =>
                                setSceneJsonText(
                                  setSceneDisableNarration(
                                    sceneJsonText,
                                    s.sceneId,
                                    event.target.checked,
                                  ),
                                )
                              }
                            />
                            <span>없음</span>
                          </label>
                        </td>
                        <td className="max-w-56 py-2 pr-2 text-xs leading-snug">
                          {s.disableNarration ? (
                            <span className="text-muted-foreground">
                              렌더 시 나레이션 미포함
                            </span>
                          ) : (
                            <span className="line-clamp-3">{s.narration}</span>
                          )}
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

          {parsed.ok ? (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">자막 편집</h3>
                <p className="text-xs leading-5 text-muted-foreground">
                  씬별 `subtitle`을 바로 수정하고 오른쪽 프리뷰에서 번인 느낌을 미리 확인할 수
                  있습니다.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3">
                  {previewScenes.map((scene) => {
                    const isActive = scene.sceneId === activePreviewScene?.sceneId;
                    return (
                      <div
                        key={scene.sceneId}
                        onClick={() => setPreviewSceneId(scene.sceneId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setPreviewSceneId(scene.sceneId);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isActive
                            ? 'border-foreground bg-background shadow-sm'
                            : 'border-border bg-background/70 hover:bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">Scene {scene.sceneId}</p>
                          <span className="text-xs text-muted-foreground">
                            {scene.durationSec}s
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {scene.disableNarration
                            ? '나레이션 없음'
                            : scene.narration || '나레이션이 없습니다.'}
                        </p>
                        <textarea
                          className="mt-3 min-h-[82px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                          value={scene.subtitle}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            setSceneJsonText(
                              setSceneSubtitle(
                                sceneJsonText,
                                scene.sceneId,
                                event.target.value,
                              ),
                            )
                          }
                          placeholder="씬 자막을 입력하세요"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{scene.subtitle.trim().length || 0} chars</span>
                          <span>
                            {scene.videoPreviewUrl || scene.imagePreviewUrl
                              ? '에셋 프리뷰 사용'
                              : '배경 프리뷰 없음'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activePreviewScene
                          ? `Scene ${activePreviewScene.sceneId} 프리뷰`
                          : '프리뷰'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        실제 렌더 전 레이아웃만 빠르게 확인합니다.
                      </p>
                    </div>
                    {activePreviewScene ? (
                      <span className="text-xs text-muted-foreground">
                        {activePreviewScene.durationSec}s
                      </span>
                    ) : null}
                  </div>
                  <div className="relative mx-auto aspect-9/16 w-full max-w-[280px] overflow-hidden rounded-[28px] border bg-black shadow-sm">
                    {activePreviewScene?.videoPreviewUrl ? (
                      <video
                        key={activePreviewScene.videoPreviewUrl}
                        src={activePreviewScene.videoPreviewUrl}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : activePreviewScene?.imagePreviewUrl ? (
                      <img
                        src={activePreviewScene.imagePreviewUrl}
                        alt={`Scene ${activePreviewScene.sceneId} preview`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-b from-zinc-800 to-zinc-950 px-6 text-center text-xs text-zinc-400">
                        비주얼 에셋이 없으면 자막 레이아웃만 미리 볼 수 있습니다.
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/20 to-transparent px-5 pb-10 pt-20">
                      <p className="text-center text-[22px] font-semibold leading-tight text-black [text-shadow:0_0_3px_#fff,0_0_6px_#fff,0_1px_0_#fff]">
                        {activePreviewScene?.subtitle?.trim() || '자막 미리보기'}
                      </p>
                    </div>
                  </div>
                  {activePreviewScene ? (
                    <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">현재 프리뷰 자막</p>
                      <p className="mt-1 whitespace-pre-wrap leading-5">
                        {activePreviewScene.subtitle || '입력된 자막이 없습니다.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

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
