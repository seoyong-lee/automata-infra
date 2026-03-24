'use client';

import { cn } from '@packages/ui';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { SceneJsonPayload } from '@packages/graphql';
import { Input } from '@packages/ui/input';
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

type ParsedScene = SceneJsonPayload['scenes'][number];

function updateScene(
  text: string,
  sceneId: number,
  updater: (scene: ParsedScene) => ParsedScene,
): string {
  const parsed = JSON.parse(text) as SceneJsonPayload;
  return JSON.stringify(
    {
      ...parsed,
      scenes: parsed.scenes.map((scene) => (scene.sceneId === sceneId ? updater(scene) : scene)),
    },
    null,
    2,
  );
}

function parseSfx(value: string): string[] | undefined {
  const tokens = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return tokens.length > 0 ? tokens : undefined;
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
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);

  useEffect(() => {
    setSceneJsonText(initialValue);
  }, [initialValue]);

  const parsed = useMemo(() => tryParseSceneJson(sceneJsonText), [sceneJsonText]);
  const previewAssetBySceneId = useMemo(
    () => new Map(previewAssets.map((asset) => [asset.sceneId, asset])),
    [previewAssets],
  );
  const scenes = parsed.ok
    ? parsed.data.scenes.map((scene) => ({
        ...scene,
        imagePreviewUrl: previewAssetBySceneId.get(scene.sceneId)?.imagePreviewUrl,
        videoPreviewUrl: previewAssetBySceneId.get(scene.sceneId)?.videoPreviewUrl,
      }))
    : [];
  const activeScene = scenes.find((scene) => scene.sceneId === activeSceneId) ?? scenes[0];
  const totalDurationSec = scenes.reduce((sum, scene) => sum + Number(scene.durationSec || 0), 0);

  useEffect(() => {
    if (!scenes.length) {
      if (activeSceneId !== null) {
        setActiveSceneId(null);
      }
      return;
    }
    if (activeSceneId === null || !scenes.some((scene) => scene.sceneId === activeSceneId)) {
      setActiveSceneId(scenes[0]?.sceneId ?? null);
    }
  }, [activeSceneId, scenes]);

  const updateActiveScene = (updater: (scene: ParsedScene) => ParsedScene) => {
    if (!activeScene) {
      return;
    }
    setSceneJsonText((current) => updateScene(current, activeScene.sceneId, updater));
  };

  return (
    <div className="space-y-6">
      <Card className="border-admin-outline-ghost shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-primary">
                  Scene Design
                </p>
                <CardTitle className="text-xl">씬 목록과 활성 씬 편집기</CardTitle>
              </div>
              <CardDescription className="max-w-3xl leading-6">
                Scene JSON을 바로 표처럼 보는 대신, 활성 씬을 선택해 프롬프트·나레이션·자막·사운드
                메모를 편집하는 방식으로 재구성했습니다. 세부 JSON 보정은 아래 고급 편집에서 계속 할
                수 있습니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={isRunning} onClick={onRun}>
                {isRunning ? '실행 중…' : 'Scene JSON 생성'}
              </Button>
              <Button
                disabled={isSaving || sceneJsonText.trim().length === 0}
                onClick={() => onSave(sceneJsonText)}
              >
                {isSaving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {parsed.ok ? (
            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-admin-outline-ghost bg-admin-surface-section p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                    Sequence Overview
                  </p>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs text-admin-text-muted">Video Title</p>
                      <p className="mt-1 text-sm font-semibold text-admin-text-strong">
                        {parsed.data.videoTitle || '제목 없음'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                          Language
                        </p>
                        <p className="mt-1 text-sm font-semibold text-admin-text-strong">
                          {parsed.data.language}
                        </p>
                      </div>
                      <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                          Duration
                        </p>
                        <p className="mt-1 text-sm font-semibold text-admin-text-strong">
                          {totalDurationSec}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {scenes.map((scene) => {
                    const isActive = scene.sceneId === activeScene?.sceneId;
                    const hasPreview = Boolean(scene.videoPreviewUrl || scene.imagePreviewUrl);
                    return (
                      <button
                        key={scene.sceneId}
                        type="button"
                        onClick={() => setActiveSceneId(scene.sceneId)}
                        className={cn(
                          'w-full rounded-2xl border p-4 text-left transition-colors',
                          isActive
                            ? 'border-admin-primary bg-admin-surface-card shadow-sm'
                            : 'border-admin-outline-ghost bg-admin-surface-section hover:bg-admin-surface-card',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-admin-text-strong">
                              Scene {scene.sceneId}
                            </p>
                            <p className="mt-1 text-xs text-admin-text-muted">
                              {scene.durationSec}s
                            </p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              hasPreview
                                ? 'bg-admin-status-success-surface text-admin-status-success'
                                : 'bg-admin-surface-field text-admin-text-muted',
                            )}
                          >
                            {hasPreview ? 'Preview' : 'Draft'}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-admin-text-muted">
                          {scene.narration?.trim() || scene.imagePrompt || '아직 설명이 없습니다.'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                {activeScene ? (
                  <div className="rounded-2xl border border-admin-outline-ghost bg-admin-surface-card p-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-primary">
                          Active Scene
                        </p>
                        <h3 className="text-2xl font-semibold text-admin-text-strong">
                          Scene {activeScene.sceneId}
                        </h3>
                      </div>
                      <label className="space-y-1 text-sm">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                          Duration
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={String(activeScene.durationSec ?? '')}
                          onChange={(event) =>
                            updateActiveScene((scene) => ({
                              ...scene,
                              durationSec: Number(event.target.value || 0),
                            }))
                          }
                          className="w-28 border-admin-outline-ghost bg-admin-surface-field"
                        />
                      </label>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4">
                        <label className="block space-y-2">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                            Visual Prompt
                          </span>
                          <textarea
                            className="min-h-[180px] w-full rounded-xl border border-admin-outline-ghost bg-admin-surface-field px-4 py-3 text-sm leading-7 text-admin-text-strong outline-none transition focus:border-admin-primary"
                            value={activeScene.imagePrompt}
                            onChange={(event) =>
                              updateActiveScene((scene) => ({
                                ...scene,
                                imagePrompt: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                            Motion / Video Prompt
                          </span>
                          <textarea
                            className="min-h-[120px] w-full rounded-xl border border-admin-outline-ghost bg-admin-surface-field px-4 py-3 text-sm leading-7 text-admin-text-strong outline-none transition focus:border-admin-primary"
                            value={activeScene.videoPrompt ?? ''}
                            placeholder="카메라 움직임이나 영상 프롬프트 메모를 입력하세요."
                            onChange={(event) =>
                              updateActiveScene((scene) => ({
                                ...scene,
                                videoPrompt: event.target.value || undefined,
                              }))
                            }
                          />
                        </label>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                              Narration
                            </span>
                            <textarea
                              className="min-h-[150px] w-full rounded-xl border border-admin-outline-ghost bg-admin-surface-field px-4 py-3 text-sm leading-7 text-admin-text-strong outline-none transition focus:border-admin-primary"
                              value={activeScene.narration}
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  narration: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                              Subtitle
                            </span>
                            <textarea
                              className="min-h-[150px] w-full rounded-xl border border-admin-outline-ghost bg-admin-surface-field px-4 py-3 text-sm leading-7 text-admin-text-strong outline-none transition focus:border-admin-primary"
                              value={activeScene.subtitle}
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  subtitle: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border border-admin-outline-ghost bg-admin-surface-section px-4 py-3 text-sm text-admin-text-strong">
                          <input
                            type="checkbox"
                            checked={Boolean(activeScene.disableNarration)}
                            onChange={(event) =>
                              updateActiveScene((scene) => ({
                                ...scene,
                                disableNarration: event.target.checked,
                              }))
                            }
                          />
                          <span>나레이션 생성에서 이 씬을 제외합니다.</span>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-admin-outline-ghost bg-admin-surface-section p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                                Scene Preview
                              </p>
                              <p className="mt-1 text-xs text-admin-text-muted">
                                저장된 에셋이 있으면 프리뷰를 보여주고, 없으면 자막 레이아웃만
                                확인합니다.
                              </p>
                            </div>
                          </div>
                          <div className="relative mt-4 aspect-4/5 overflow-hidden rounded-[24px] border bg-black shadow-sm">
                            {activeScene.videoPreviewUrl ? (
                              <video
                                key={activeScene.videoPreviewUrl}
                                src={activeScene.videoPreviewUrl}
                                className="h-full w-full object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            ) : activeScene.imagePreviewUrl ? (
                              <img
                                src={activeScene.imagePreviewUrl}
                                alt={`Scene ${activeScene.sceneId} preview`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-linear-to-b from-zinc-800 to-zinc-950 px-6 text-center text-xs text-zinc-400">
                                아직 생성된 프리뷰가 없습니다.
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/20 to-transparent px-5 pb-8 pt-20">
                              <p className="text-center text-xl font-semibold leading-tight text-black [text-shadow:0_0_3px_#fff,0_0_6px_#fff,0_1px_0_#fff]">
                                {activeScene.subtitle?.trim() || '자막 미리보기'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-admin-outline-ghost bg-admin-surface-section p-4 space-y-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-text-muted">
                              Audio / Mood
                            </p>
                            <p className="mt-1 text-xs text-admin-text-muted">
                              현재 스키마에 있는 보조 메타데이터만 편집합니다.
                            </p>
                          </div>
                          <label className="block space-y-2">
                            <span className="block text-xs font-medium text-admin-text-muted">
                              Background Mood
                            </span>
                            <Input
                              value={activeScene.bgmMood ?? ''}
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  bgmMood: event.target.value || undefined,
                                }))
                              }
                              className="border-admin-outline-ghost bg-admin-surface-field"
                            />
                          </label>
                          <label className="block space-y-2">
                            <span className="block text-xs font-medium text-admin-text-muted">
                              SFX
                            </span>
                            <Input
                              value={(activeScene.sfx ?? []).join(', ')}
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  sfx: parseSfx(event.target.value),
                                }))
                              }
                              placeholder="pulse, click, whoosh"
                              className="border-admin-outline-ghost bg-admin-surface-field"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-admin-outline-ghost px-4 py-8 text-center text-sm text-admin-text-muted">
              {sceneJsonText.trim()
                ? '유효한 Scene JSON이 아닙니다. 생성을 다시 실행하거나 아래 고급 편집에서 형식을 맞춰 주세요.'
                : '아직 Scene JSON이 없습니다. 생성 버튼으로 초안을 만드세요.'}
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

      <Card className="border-admin-outline-ghost shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">고급 · Raw JSON</CardTitle>
          <CardDescription>
            위 편집기와 동일한 내용을 직접 수정할 수 있습니다. 복잡한 필드 보정이 필요할 때만
            사용하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-[300px] w-full rounded-xl border border-admin-outline-ghost bg-admin-surface-section px-4 py-3 font-mono text-xs text-admin-text-strong outline-none transition focus:border-admin-primary"
            value={sceneJsonText}
            onChange={(event) => setSceneJsonText(event.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
