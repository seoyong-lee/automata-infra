import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { stepTitle, type LlmStepSettings } from '@/entities/llm-step';
import { type ChannelSummary } from '../model';

type GeneralSectionProps = {
  items: LlmStepSettings[];
  channelSummary: ChannelSummary;
};

export function GeneralSection({ items, channelSummary }: GeneralSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{channelSummary.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto Publish Enabled</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{channelSummary.autoPublish}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LLM Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{items.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">유튜브 설정 있는 콘텐츠</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{channelSummary.dbSource}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 xl:col-span-2">
        <CardHeader>
          <CardTitle>General Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>대시보드는 통합 관제판이고, 실제 조작은 콘텐츠 관리에서 수행합니다.</p>
          <p>설정은 채널 연결, 글로벌 모델 기본값, publish 정책을 다룹니다.</p>
          <p>운영 상태와 병목 정보는 설정이 아니라 콘텐츠 관리와 대시보드에 남겨둡니다.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 xl:col-span-2">
        <CardHeader>
          <CardTitle>Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Playlist configured: {channelSummary.withPlaylist}</p>
          <p>콘텐츠 카탈로그 항목 수: {channelSummary.total}</p>
          <p>
            Prompt/model steps: {items.map((item) => stepTitle(item.stepKey)).join(', ') || '-'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
