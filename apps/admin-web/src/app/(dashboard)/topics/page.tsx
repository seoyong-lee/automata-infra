import { redirect } from 'next/navigation';

/** 예전 북마크용: 토픽은 잡·잡 상세에서 다룹니다. */
export default function TopicsRedirectRoute() {
  redirect('/jobs');
}
