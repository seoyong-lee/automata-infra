'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';

type Props = {
  suggestionCount: number;
  savingsPercent: number;
};

export function DashboardOptimizationCard({ suggestionCount, savingsPercent }: Props) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-admin-primary p-6 text-white shadow-lg shadow-slate-900/10">
      <button className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg bg-admin-primary-container text-white">
        <Plus className="size-4" />
      </button>
      <div className="relative z-10 max-w-sm">
        <h3 className="font-admin-display text-lg font-bold">Automated Optimization</h3>
        <p className="mt-2 text-xs leading-6 text-indigo-100/90">
          The system has identified {suggestionCount} possible optimizations for your asset
          generation pipeline that could save {savingsPercent}% in compute costs.
        </p>
        <Link
          href="/executions"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-indigo-500 px-4 text-xs font-bold text-white transition-colors hover:bg-indigo-400"
        >
          Review Suggestions
        </Link>
      </div>
      <div
        aria-hidden
        className="absolute -bottom-10 -right-6 size-32 rounded-full border border-indigo-300/20 bg-indigo-300/10"
      />
      <div
        aria-hidden
        className="absolute bottom-3 right-5 size-12 rounded-full border border-indigo-300/15"
      />
    </section>
  );
}
