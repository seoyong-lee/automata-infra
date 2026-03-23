'use client';

import { Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

type Props = {
  suggestionCount: number;
  savingsPercent: number;
};

export function DashboardOptimizationCard({ suggestionCount, savingsPercent }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-admin-primary p-6 text-white shadow-xl shadow-slate-900/10">
      <button className="absolute right-4 top-4 hidden size-8 items-center justify-center rounded-lg bg-admin-primary-container text-white md:flex">
        <Plus className="size-4" />
      </button>
      <div className="relative z-10 max-w-sm">
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-white/10">
          <Sparkles className="size-4 text-indigo-100" />
        </div>
        <h3 className="font-admin-display text-lg font-bold">Automated Optimization</h3>
        <p className="mt-2 text-xs leading-6 text-indigo-100/90">
          The system has identified {suggestionCount} possible optimizations for your asset
          generation pipeline that could save {savingsPercent}% in compute costs.
        </p>
        <Link
          href="/executions"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-admin-primary transition-colors hover:bg-indigo-50 md:h-9 md:w-auto md:rounded-lg md:bg-indigo-500 md:text-xs md:text-white md:hover:bg-indigo-400"
        >
          Execute Optimization
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
