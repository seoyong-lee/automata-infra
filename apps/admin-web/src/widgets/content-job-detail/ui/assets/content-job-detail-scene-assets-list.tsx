'use client';

import type { AssetGenerationModality, ImageGenerationProvider } from '@packages/graphql';

import type { VoiceProfile } from '@/entities/voice-profile';
import type { SceneAssetCard } from '../../model/job-detail-scene-assets';
import { ContentJobDetailSceneAssetCard } from './content-job-detail-scene-asset-card';

type ContentJobDetailSceneAssetsListProps = {
  jobId: string;
  cards: SceneAssetCard[];
  isRunning: boolean;
  isSubmitting: boolean;
  onRegenerateScene: (input: {
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

export function ContentJobDetailSceneAssetsList({
  jobId,
  cards,
  isRunning,
  isSubmitting,
  onRegenerateScene,
  onSelectImageCandidate,
  isSelectingImageCandidate,
  imageProvider,
  onImageProviderChange,
  voiceProfiles,
  isSavingVoiceProfileSelection,
  onSceneVoiceProfileChange,
}: ContentJobDetailSceneAssetsListProps) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        씬 데이터가 없습니다. 씬 JSON 단계를 완료한 뒤 다시 확인해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <ContentJobDetailSceneAssetCard
          key={card.sceneId}
          jobId={jobId}
          card={card}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onRegenerate={onRegenerateScene}
          onSelectImageCandidate={onSelectImageCandidate}
          isSelectingImageCandidate={isSelectingImageCandidate}
          imageProvider={imageProvider}
          onImageProviderChange={onImageProviderChange}
          voiceProfiles={voiceProfiles}
          isSavingVoiceProfileSelection={isSavingVoiceProfileSelection}
          onSceneVoiceProfileChange={onSceneVoiceProfileChange}
        />
      ))}
    </div>
  );
}
