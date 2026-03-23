'use client';

import { cn } from '@packages/ui';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export type AdminPageBackProps = {
  href: string;
  /** 기본: 뒤로 */
  label?: string;
  className?: string;
};

export function AdminPageBack({ href, label, className }: AdminPageBackProps) {
  const t = useTranslations('common');

  return (
    <div className={cn(className)}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        <span>{label ?? t('back')}</span>
      </Link>
    </div>
  );
}
