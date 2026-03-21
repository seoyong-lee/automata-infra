import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import type { AdminContent } from '@packages/graphql';
import Link from 'next/link';

import { ContentChannelSettingsCard } from '@/features/content-channel-settings';

type ChannelsSectionProps = {
  contents: AdminContent[];
};

export function ChannelsSection({ contents }: ChannelsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>콘텐츠(채널) · 유튜브 게시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            콘텐츠는{' '}
            <Link href="/content" className="text-primary underline">
              콘텐츠 관리
            </Link>
            에서 추가합니다. 여기서는 각 콘텐츠에 붙은 유튜브 OAuth 시크릿·업로드 기본값을 수정합니다.
          </p>
          <p>시크릿 값은 Secrets Manager에 두고, 여기에는 시크릿 이름만 저장합니다.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {contents.map((c) => (
          <ContentChannelSettingsCard key={c.contentId} content={c} />
        ))}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">콘텐츠 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/content/new"
              className="text-sm font-medium text-primary underline"
            >
              새 콘텐츠(채널) 등록 →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
