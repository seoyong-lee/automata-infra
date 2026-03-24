'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { ContentJobDetailSeedFormPanel } from '@/features/content-job-detail';

import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';

type Props = {
  jobId: string;
  pageData: ContentJobDetailPageData;
};

const mockOutline = [
  {
    step: 1,
    title: 'Introduction: The Analog Crisis',
    body: 'Highlighting current inefficiencies in traditional architectural modeling and the shift toward digital twins.',
    tags: ['B-Roll: City Timelapse', 'Visual: Blueprint Overlays'],
  },
  {
    step: 2,
    title: 'The Generative Engine',
    body: "Visualizing the 'seed' inputs and how the AI iterates through thousands of structural variations in seconds.",
    tags: ['Visual: 3D Grid Formation', 'Audio: Synth Pulses'],
  },
  {
    step: 3,
    title: 'Conclusion: Human-AI Collaboration',
    body: 'Reiterating that AI is a tool for augmentation, not replacement. Call to action for the next episode.',
    tags: [],
  },
] as const;

export function ContentJobDetailIdeationTab({ jobId: _jobId, pageData }: Props) {
  const { detailVm } = pageData;
  const seed = detailVm.seedFormInitialValue;
  const suggestedTitle =
    pageData.detail?.job.videoTitle?.trim() ||
    'Blueprint of Tomorrow: How AI is Reshaping Our Skylines';

  return (
    <div className="grid min-h-[560px] gap-6 xl:grid-cols-[minmax(300px,0.33fr)_minmax(0,0.67fr)]">
        <ContentJobDetailSeedFormPanel
          key={detailVm.seedFormKey}
          initialValue={detailVm.seedFormInitialValue}
          hasTopicPlan={Boolean(pageData.detail?.job.topicS3Key)}
          isRunningTopicPlan={pageData.isRunningTopicPlan}
          isSaving={pageData.isSavingTopicSeed}
          onRunTopicPlan={pageData.runTopicPlan}
          onSave={pageData.saveTopicSeed}
          runError={pageData.runTopicPlanError}
          saveError={pageData.updateTopicSeedError}
        />
        <Card className="overflow-hidden rounded-xl border border-admin-outline-ghost bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-admin-outline-ghost bg-admin-surface-section px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-admin-primary">✦</span>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.22em] text-admin-text-strong">
                LLM Generated Plan
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              className="h-auto px-0 text-xs font-semibold text-admin-primary hover:bg-transparent"
              disabled={pageData.isRunningTopicPlan}
              onClick={pageData.runTopicPlan}
            >
              {pageData.isRunningTopicPlan ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-8 px-7 py-8">
            <div>
              <span className="inline-block rounded bg-[rgba(99,102,241,0.08)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(79,70,229)]">
                Suggested Title
              </span>
              <h3 className="mt-4 max-w-4xl font-admin-display text-[2.15rem] font-extrabold leading-[1.18] tracking-tight text-admin-text-strong">
                {suggestedTitle}
              </h3>
            </div>

            <div className="rounded-lg border-l-4 border-[rgb(99,102,241)] bg-admin-surface-section px-5 py-4">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(79,70,229)]">
                Opening Hook
              </span>
              <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-admin-text-strong italic">
                &quot;{seed.creativeBrief?.trim()
                  ? seed.creativeBrief.split('\n')[0]
                  : "What if your next home wasn't designed by a human architect, but by an algorithm that understood your needs before you did? Welcome to the era of generative architecture."}
                &quot;
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-admin-text-muted">
                Production Outline
              </p>
              <div className="mt-5 space-y-6">
                {mockOutline.map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={
                          index === 0
                            ? 'flex h-8 w-8 items-center justify-center rounded-full bg-admin-primary text-xs font-bold text-white'
                            : 'flex h-8 w-8 items-center justify-center rounded-full bg-admin-surface-section text-xs font-bold text-admin-text-muted'
                        }
                      >
                        {item.step}
                      </div>
                      {index < mockOutline.length - 1 ? (
                        <div className="my-2 w-px flex-1 bg-admin-outline-ghost" />
                      ) : null}
                    </div>
                    <div className={index < mockOutline.length - 1 ? 'pb-6' : ''}>
                      <h4 className="text-[1.15rem] font-bold text-admin-text-strong">{item.title}</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-7 text-admin-text-muted">
                        {item.body}
                      </p>
                      {item.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-admin-surface-section px-2 py-1 text-[10px] font-medium text-admin-text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
