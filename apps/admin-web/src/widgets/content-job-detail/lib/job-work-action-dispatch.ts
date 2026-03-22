import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import type { JobWorkPrimaryAction } from './resolve-job-work-action';

type RouterLike = {
  push: (href: string) => void;
};

export function dispatchJobWorkAction(
  action: JobWorkPrimaryAction,
  ctx: {
    jobId: string;
    router: RouterLike;
    pageData: ContentJobDetailPageData;
  },
): void {
  const { jobId, router, pageData } = ctx;
  switch (action) {
    case 'run_topic_plan':
      pageData.runTopicPlan();
      return;
    case 'run_scene_json':
      pageData.runSceneJson();
      return;
    case 'run_assets':
      pageData.runAssetGeneration();
      return;
    case 'open_reviews':
      pageData.openReviews();
      return;
    case 'go_publish':
      router.push(`/jobs/${jobId}/publish`);
      return;
    case 'go_ideation':
      router.push(`/jobs/${jobId}/ideation`);
      return;
    case 'go_scene':
      router.push(`/jobs/${jobId}/scene`);
      return;
    case 'go_assets':
      router.push(`/jobs/${jobId}/assets`);
      return;
    case 'go_timeline':
      router.push(`/jobs/${jobId}/timeline`);
      return;
    case 'go_overview':
      router.push(`/jobs/${jobId}/overview`);
      return;
    default:
      return;
  }
}
