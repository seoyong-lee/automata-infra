'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { type VoiceProfile, useUpsertVoiceProfile } from '@/entities/voice-profile';
import { SettingsSectionIntro, SettingsStatCard } from './settings-section-primitives';

type VoicesSectionProps = {
  voiceProfiles: VoiceProfile[];
};

type VoiceProfileFormState = {
  profileId?: string;
  label: string;
  provider: string;
  voiceId: string;
  modelId: string;
  sampleAudioUrl: string;
  description: string;
  language: string;
  speed: string;
  stability: string;
  similarityBoost: string;
  style: string;
  useSpeakerBoost: boolean;
  isActive: boolean;
};

const toFormState = (profile?: VoiceProfile): VoiceProfileFormState => ({
  profileId: profile?.profileId,
  label: profile?.label ?? '',
  provider: profile?.provider ?? 'ELEVENLABS',
  voiceId: profile?.voiceId ?? '',
  modelId: profile?.modelId ?? '',
  sampleAudioUrl: profile?.sampleAudioUrl ?? '',
  description: profile?.description ?? '',
  language: profile?.language ?? '',
  speed: profile?.speed != null ? String(profile.speed) : '',
  stability: profile?.stability != null ? String(profile.stability) : '',
  similarityBoost: profile?.similarityBoost != null ? String(profile.similarityBoost) : '',
  style: profile?.style != null ? String(profile.style) : '',
  useSpeakerBoost: profile?.useSpeakerBoost ?? false,
  isActive: profile?.isActive ?? true,
});

function VoiceProfileEditorCard({ profile }: { profile?: VoiceProfile }) {
  const fieldClassName =
    'border-admin-outline-ghost bg-admin-surface-field text-admin-text-strong placeholder:text-admin-text-muted';
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VoiceProfileFormState>(() => toFormState(profile));
  const mutation = useUpsertVoiceProfile({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['voiceProfiles'] });
    },
  });

  useEffect(() => {
    setForm(toFormState(profile));
  }, [profile]);

  const onText =
    (key: keyof VoiceProfileFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };

  const onBool =
    (key: 'useSpeakerBoost' | 'isActive') => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.checked }));
    };

  const onSave = () => {
    mutation.mutate({
      profileId: form.profileId,
      label: form.label.trim(),
      provider: form.provider.trim() || 'ELEVENLABS',
      voiceId: form.voiceId.trim(),
      modelId: form.modelId.trim() || undefined,
      sampleAudioUrl: form.sampleAudioUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      language: form.language.trim() || undefined,
      speed: form.speed ? Number(form.speed) : undefined,
      stability: form.stability ? Number(form.stability) : undefined,
      similarityBoost: form.similarityBoost ? Number(form.similarityBoost) : undefined,
      style: form.style ? Number(form.style) : undefined,
      useSpeakerBoost: form.useSpeakerBoost,
      isActive: form.isActive,
    });
  };

  return (
    <Card className="border-admin-outline-ghost bg-admin-surface-card shadow-sm">
      <CardHeader className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
          {profile ? 'Profile' : 'New'}
        </p>
        <CardTitle className="text-base text-admin-text-strong">
          {profile ? profile.label : '새 보이스 프로필'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            className={fieldClassName}
            value={form.label}
            onChange={onText('label')}
            placeholder="프로필 이름"
          />
          <Input
            className={fieldClassName}
            value={form.provider}
            onChange={onText('provider')}
            placeholder="provider 이름"
          />
          <Input
            className={fieldClassName}
            value={form.voiceId}
            onChange={onText('voiceId')}
            placeholder="voice ID"
          />
          <Input
            className={fieldClassName}
            value={form.modelId}
            onChange={onText('modelId')}
            placeholder="model ID"
          />
          <Input
            className={fieldClassName}
            value={form.language}
            onChange={onText('language')}
            placeholder="language"
          />
          <Input
            className={fieldClassName}
            value={form.sampleAudioUrl}
            onChange={onText('sampleAudioUrl')}
            placeholder="샘플 오디오 URL"
          />
          <Input
            className={fieldClassName}
            value={form.speed}
            onChange={onText('speed')}
            placeholder="speed"
          />
          <Input
            className={fieldClassName}
            value={form.stability}
            onChange={onText('stability')}
            placeholder="stability"
          />
          <Input
            className={fieldClassName}
            value={form.similarityBoost}
            onChange={onText('similarityBoost')}
            placeholder="similarity boost"
          />
          <Input
            className={fieldClassName}
            value={form.style}
            onChange={onText('style')}
            placeholder="style"
          />
        </div>
        <textarea
          className="min-h-24 w-full rounded-md border border-admin-outline-ghost bg-admin-surface-field px-3 py-2 text-sm text-admin-text-strong"
          value={form.description}
          onChange={onText('description')}
          placeholder="설명"
        />
        <label className="flex items-center gap-2 rounded-md border border-admin-outline-ghost bg-admin-surface-section/70 px-3 py-2 text-sm text-admin-text-strong">
          <input
            type="checkbox"
            checked={form.useSpeakerBoost}
            onChange={onBool('useSpeakerBoost')}
          />
          <span>speaker boost 사용</span>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-admin-outline-ghost bg-admin-surface-section/70 px-3 py-2 text-sm text-admin-text-strong">
          <input type="checkbox" checked={form.isActive} onChange={onBool('isActive')} />
          <span>활성 상태</span>
        </label>
        {form.sampleAudioUrl ? (
          <audio controls src={form.sampleAudioUrl} className="w-full" />
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-admin-text-muted">
            {profile
              ? `마지막 반영: ${profile.updatedAt} · ${profile.updatedBy}`
              : '새 프로필은 저장 시 생성됩니다.'}
          </p>
          <Button onClick={onSave} disabled={mutation.isPending}>
            {mutation.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
        {mutation.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function VoicesSection({ voiceProfiles }: VoicesSectionProps) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-4">
      <SettingsSectionIntro
        eyebrow="보이스"
        title="TTS 보이스 라이브러리"
        description="보이스 ID, 샘플 오디오, 속도와 안정성 파라미터를 전역 라이브러리로 관리합니다. 에셋 화면에서는 이 프로필을 잡 기본값 또는 씬별 오버라이드로 선택합니다."
        aside={
          <Button variant="outline" onClick={() => setShowNew((current) => !current)}>
            {showNew ? '새 프로필 입력 닫기' : '새 보이스 프로필 추가'}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatCard
          label="프로필 수"
          value={voiceProfiles.length}
          hint="등록된 보이스 프로필 수"
        />
        <SettingsStatCard
          label="기본 공급자"
          value="ElevenLabs"
          hint="현재 기본 보이스 라이브러리 공급자"
        />
        <SettingsStatCard
          label="선택 방식"
          value="재사용"
          hint="잡 기본값 또는 씬별 override로 재사용"
        />
      </div>

      {showNew ? <VoiceProfileEditorCard /> : null}

      <div className="grid gap-6">
        {voiceProfiles.map((profile) => (
          <VoiceProfileEditorCard key={profile.profileId} profile={profile} />
        ))}
      </div>
    </div>
  );
}
