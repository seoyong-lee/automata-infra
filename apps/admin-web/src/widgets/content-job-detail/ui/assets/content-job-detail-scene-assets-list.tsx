'use client';

import type { AssetGenerationModality } from '@packages/graphql';

import type { SceneAssetCard } from '../../model/job-detail-scene-assets';
import { ContentJobDetailSceneAssetCard } from './content-job-detail-scene-asset-card';

type ContentJobDetailSceneAssetsListProps = {
  jobId: string;
  cards: SceneAssetCard[];
  isRunning: boolean;
  onRegenerateScene: (input: { sceneId: number; modality: AssetGenerationModality }) => void;
};

export function ContentJobDetailSceneAssetsList({
  jobId,
  cards,
  isRunning,
  onRegenerateScene,
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
          onRegenerate={onRegenerateScene}
        />
      ))}
    </div>
  );
}
