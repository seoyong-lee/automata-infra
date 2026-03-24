'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

type Props = {
  jobId: string;
  activeStep: 1 | 2 | 3 | 4;
};

const steps = [
  { step: 1 as const, label: 'Ideation', href: (jobId: string) => `/jobs/${jobId}/ideation` },
  { step: 2 as const, label: 'Scene Logic', href: (jobId: string) => `/jobs/${jobId}/scene` },
  { step: 3 as const, label: 'Assets', href: (jobId: string) => `/jobs/${jobId}/assets` },
  { step: 4 as const, label: 'Publish', href: (jobId: string) => `/jobs/${jobId}/publish` },
] as const;

export function ContentJobDetailStepper({ jobId, activeStep }: Props) {
  return (
    <div className="rounded-xl bg-admin-surface-section p-1.5">
      <div className="flex items-center gap-2">
        {steps.map((item, index) => {
          const isComplete = item.step < activeStep;
          const isActive = item.step === activeStep;

          return (
            <div key={item.step} className="flex min-w-0 flex-1 items-center gap-2">
              <Link
                href={item.href(jobId)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-4 py-3 transition-colors',
                  isActive
                    ? 'border border-[#d7dcff] bg-[rgba(99,102,241,0.08)]'
                    : isComplete
                      ? 'border border-admin-outline-ghost bg-white shadow-sm'
                      : 'opacity-50',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    isActive || isComplete
                      ? 'bg-admin-primary text-white'
                      : 'bg-slate-400 text-white',
                  )}
                >
                  {item.step}
                </div>
                <span
                  className={cn(
                    'truncate text-xs font-bold uppercase tracking-[0.14em]',
                    isActive
                      ? 'text-[#312e81]'
                      : isComplete
                        ? 'text-admin-text-strong'
                        : 'text-admin-text-muted',
                  )}
                >
                  {item.label}
                </span>
                {isComplete ? (
                  <span className="ml-auto text-base leading-none text-green-500">✓</span>
                ) : null}
                {isActive ? (
                  <span className="ml-auto rounded bg-[#c7d2fe] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#4338ca]">
                    Active
                  </span>
                ) : null}
              </Link>
              {index < steps.length - 1 ? (
                <div className="flex w-6 shrink-0 items-center justify-center text-slate-300">›</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
