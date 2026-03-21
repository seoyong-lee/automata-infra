'use client';

import { cn } from '@packages/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const linkBtn =
  'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function TopicManagementPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="토픽 관리"
        subtitle="토픽 플랜은 콘텐츠 잡 단위로 생성·저장됩니다. 스크립트(씬 JSON) 생성 전에 반드시 완료해야 합니다."
      />

      <Card>
        <CardHeader>
          <CardTitle>워크플로</CardTitle>
          <CardDescription>
            토픽 시드를 입력한 뒤 토픽 플랜을 실행하면 S3에 플랜이 기록되고, 이후 스크립트 생성
            단계로 진행할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/content"
            className={cn(linkBtn, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            콘텐츠로 이동
          </Link>
          <Link
            href="/jobs"
            className={cn(
              linkBtn,
              'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
            )}
          >
            잡 목록
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
