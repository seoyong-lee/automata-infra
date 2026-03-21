'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { Input } from '@packages/ui/input';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCreateContent } from '@/entities/admin-content';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function CreateContentPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [youtubeSecretName, setYoutubeSecretName] = useState('');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const create = useCreateContent({
    onSuccess: ({ createContent }) => {
      router.push(`/content/${createContent.contentId}/jobs`);
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageBack href="/content" label="콘텐츠 목록으로" />
        <AdminPageHeader
          title="콘텐츠 추가"
          subtitle="콘텐츠는 contentId 하나로 식별합니다. 표시 이름만 정하고, 유튜브 연동은 선택·생성 후에도 설정할 수 있습니다."
        />
      </div>
      <Card className="">
        <CardHeader>
          <CardTitle>새 콘텐츠</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <div className="flex flex-col gap-1 text-sm mb-4">
            <span className="font-medium">표시 이름</span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 메인 숏츠 채널"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm mb-4">
            <span className="font-medium">YouTube OAuth 시크릿 이름 (선택)</span>
            <Input
              value={youtubeSecretName}
              onChange={(e) => setYoutubeSecretName(e.target.value)}
              placeholder="Secrets Manager에 등록한 시크릿 id"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-3 text-sm mb-4">
            <input
              type="checkbox"
              checked={autoPublishEnabled}
              onChange={(e) => setAutoPublishEnabled(e.target.checked)}
            />
            <span className="font-medium">렌더 후 유튜브 자동 게시(기본 켜기)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={create.isPending || !label.trim()}
              onClick={() =>
                create.mutate({
                  label: label.trim(),
                  ...(youtubeSecretName.trim()
                    ? { youtubeSecretName: youtubeSecretName.trim() }
                    : {}),
                  ...(autoPublishEnabled ? { autoPublishEnabled: true } : {}),
                })
              }
            >
              {create.isPending ? '…' : '등록'}
            </Button>
            <Link
              href="/content"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              취소
            </Link>
          </div>
          {create.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(create.error)}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
