import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import type { AdminBreadcrumbSegment } from '@/shared/ui/admin-breadcrumb';
import type { JobDraftDetail } from '../model/types';

const isUnassignedContentId = (contentId: string | null | undefined): boolean => {
  return !contentId || contentId === ADMIN_UNASSIGNED_CONTENT_ID;
};

/** 채널에 붙은 경우에만: 해당 채널의 제작 아이템 목록으로 가는 한 단계. 미연결일 때는 세그먼트 자체를 두지 않는다(상위와 동일 URL을 반복하지 않음). */
function channelListSegmentIfAssigned(
  contentId: string | null | undefined,
): AdminBreadcrumbSegment | null {
  if (isUnassignedContentId(contentId) || !contentId) {
    return null;
  }
  return {
    label: contentId,
    href: `/content/${encodeURIComponent(contentId)}/jobs`,
  };
}

function jobsCentricSegments(detail?: JobDraftDetail): AdminBreadcrumbSegment[] {
  const contentId = detail?.job.contentId;
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType ?? 'default';

  const segments: AdminBreadcrumbSegment[] = [{ label: '제작 아이템', href: '/jobs' }];
  const channel = channelListSegmentIfAssigned(contentId);
  if (channel) {
    segments.push(channel);
  }
  segments.push({ label: contentType });
  return segments;
}

function contentCentricSegments(detail?: JobDraftDetail): AdminBreadcrumbSegment[] {
  const contentId = detail?.job.contentId;
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType ?? 'default';

  const segments: AdminBreadcrumbSegment[] = [{ label: '채널', href: '/content' }];
  const channel = channelListSegmentIfAssigned(contentId);
  if (channel) {
    segments.push(channel);
  }
  segments.push({ label: contentType });
  return segments;
}

/**
 * 제작 아이템 상세 브레드크럼: URL이 `/jobs` 중심인지 `/content` 중심인지에 따라 루트 라벨·링크를 바꾼다.
 */
export function buildJobDetailBreadcrumbSegments(
  pathname: string,
  detail?: JobDraftDetail,
): AdminBreadcrumbSegment[] {
  if (pathname.startsWith('/jobs')) {
    return jobsCentricSegments(detail);
  }

  if (pathname.startsWith('/content')) {
    return contentCentricSegments(detail);
  }

  const title = detail?.job.videoTitle?.trim();
  return [
    { label: '제작 아이템', href: '/jobs' },
    { label: title && title.length > 0 ? title : '제작 아이템 상세' },
  ];
}
