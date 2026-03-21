import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import type { AdminBreadcrumbSegment } from '@/shared/ui/admin-breadcrumb';
import type { JobDraftDetail } from '../model/types';

const isUnassignedContentId = (contentId: string | null | undefined): boolean => {
  return !contentId || contentId === ADMIN_UNASSIGNED_CONTENT_ID;
};

function middleSegment(
  contentId: string | null | undefined,
  unassigned: boolean,
): AdminBreadcrumbSegment {
  if (unassigned || !contentId) {
    return { label: '미연결 잡', href: '/jobs' };
  }
  return {
    label: contentId,
    href: `/content/${encodeURIComponent(contentId)}/jobs`,
  };
}

function jobsCentricSegments(detail?: JobDraftDetail): AdminBreadcrumbSegment[] {
  const contentId = detail?.job.contentId;
  const unassigned = isUnassignedContentId(contentId);
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType ?? 'default';

  return [
    { label: '잡', href: '/jobs' },
    middleSegment(contentId, unassigned),
    { label: contentType },
  ];
}

function contentCentricSegments(detail?: JobDraftDetail): AdminBreadcrumbSegment[] {
  const contentId = detail?.job.contentId;
  const unassigned = isUnassignedContentId(contentId);
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType ?? 'default';

  return [
    { label: '콘텐츠 관리', href: '/content' },
    middleSegment(contentId, unassigned),
    { label: contentType },
  ];
}

/**
 * 잡 상세 화면 브레드크럼: URL이 `/jobs` 중심인지 `/content` 중심인지에 따라 루트 라벨·링크를 바꾼다.
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
  return [{ label: '잡', href: '/jobs' }, { label: title && title.length > 0 ? title : '잡 상세' }];
}
