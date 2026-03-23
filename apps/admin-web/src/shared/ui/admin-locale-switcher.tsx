'use client';

import { cn } from '@packages/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { adminLocaleCookieName, type AdminLocale } from '@/i18n/config';

const localeOptions: AdminLocale[] = ['ko', 'en'];

export function AdminLocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();

  const onSelect = (nextLocale: AdminLocale) => {
    if (nextLocale === locale) return;
    document.cookie = `${adminLocaleCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-slate-200 bg-white p-1',
        className,
      )}
      aria-label={t('locale')}
      role="group"
    >
      {localeOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
            option === locale
              ? 'bg-admin-primary text-white'
              : 'text-slate-500 hover:text-admin-primary',
          )}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
