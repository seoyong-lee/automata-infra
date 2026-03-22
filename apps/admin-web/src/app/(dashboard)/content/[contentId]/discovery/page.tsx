import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ contentId: string }>;
};

/** 예전 채널 하위 URL 호환 — 전역 발굴 화면으로 이동 */
export default async function LegacyChannelDiscoveryRedirect({ params }: Props) {
  const { contentId } = await params;
  redirect(`/discovery?channel=${encodeURIComponent(contentId)}`);
}
