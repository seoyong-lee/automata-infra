'use client';

import type { AssetGenerationModality, ImageGenerationProvider } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import type { SceneAssetCard } from '../../model/job-detail-scene-assets';
import { ContentJobDetailSceneAssetCell } from './content-job-detail-scene-asset-cell';
import type { VoiceProfile } from '@/entities/voice-profile';

type ContentJobDetailSceneAssetCardProps = {
  jobId: string;
  card: SceneAssetCard;
  isRunning: boolean;
  isSubmitting: boolean;
  onRegenerate: (input: {
    sceneId: number;
    modality: AssetGenerationModality;
    imageProvider?: ImageGenerationProvider;
  }) => void;
  onSelectImageCandidate: (sceneId: number, candidateId: string) => void;
  isSelectingImageCandidate: boolean;
  imageProvider: ImageGenerationProvider;
  onImageProviderChange: (value: ImageGenerationProvider) => void;
  voiceProfiles: VoiceProfile[];
  isSavingVoiceProfileSelection: boolean;
  onSceneVoiceProfileChange: (sceneId: number, profileId?: string) => void;
};

function overallBadgeProps(overall: SceneAssetCard['overallStatus']): {
  variant: 'default' | 'secondary' | 'outline';
  className?: string;
} {
  switch (overall) {
    case 'READY':
      return { variant: 'default' };
    case 'PARTIAL':
      return { variant: 'secondary' };
    case 'FAILED':
      return {
        variant: 'outline',
        className: 'border-destructive text-destructive',
      };
    case 'PENDING':
      return { variant: 'outline' };
    default:
      return { variant: 'secondary' };
  }
}

export function ContentJobDetailSceneAssetCard({
  jobId,
  card,
  isRunning,
  isSubmitting,
  onRegenerate,
  onSelectImageCandidate,
  isSelectingImageCandidate,
  imageProvider,
  onImageProviderChange,
  voiceProfiles,
  isSavingVoiceProfileSelection,
  onSceneVoiceProfileChange,
}: ContentJobDetailSceneAssetCardProps) {
  const disabled = isSubmitting;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Scene {card.sceneId}</CardTitle>
          {card.durationSec != null ? (
            <p className="text-xs text-muted-foreground">{card.durationSec}s</p>
          ) : null}
        </div>
        <Badge {...overallBadgeProps(card.overallStatus)}>{card.statusLabel}</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <ContentJobDetailSceneAssetCell
          kind="image"
          title="이미지"
          slice={card.image}
          disabled={disabled}
          imageProvider={imageProvider}
          onImageProviderChange={onImageProviderChange}
          imageCandidates={card.imageCandidates}
          isSelectingImageCandidate={isSelectingImageCandidate}
          onSelectImageCandidate={(candidateId) =>
            onSelectImageCandidate(card.sceneId, candidateId)
          }
          onRegenerate={() =>
            onRegenerate({ sceneId: card.sceneId, modality: 'IMAGE', imageProvider })
          }
        />
        <ContentJobDetailSceneAssetCell
          kind="voice"
          title="음성"
          slice={card.voice}
          disabled={disabled}
          onRegenerate={() => onRegenerate({ sceneId: card.sceneId, modality: 'VOICE' })}
        />
        <ContentJobDetailSceneAssetCell
          kind="video"
          title="영상"
          slice={card.video}
          disabled={disabled}
          onRegenerate={() => onRegenerate({ sceneId: card.sceneId, modality: 'VIDEO' })}
        />
      </CardContent>
      <div className="px-6 pb-2">
        <label className="space-y-2 text-xs text-muted-foreground">
          <span className="block">씬 보이스 오버라이드</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={card.voiceProfileId ?? ''}
            disabled={isSavingVoiceProfileSelection}
            onChange={(event) =>
              onSceneVoiceProfileChange(
                card.sceneId,
                event.target.value ? event.target.value : undefined,
              )
            }
          >
            <option value="">잡 기본 보이스 사용</option>
            {voiceProfiles.map((profile) => (
              <option key={profile.profileId} value={profile.profileId}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CardFooter className="flex flex-wrap gap-3 border-t pt-4 text-sm">
        <Link
          href={`/jobs/${jobId}/scene`}
          className="text-primary underline-offset-4 hover:underline"
        >
          씬 검수
        </Link>
        <Link
          href={`/jobs/${jobId}/scene`}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          프롬프트
        </Link>
        <Link
          href={`/jobs/${jobId}/assets?view=byKind&stage=image`}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          종류별 보기 (고급)
        </Link>
      </CardFooter>
    </Card>
  );
}
