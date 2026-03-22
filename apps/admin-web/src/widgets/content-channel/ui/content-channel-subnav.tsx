'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type ContentChannelSubnavProps = {
  contentId: string;
};

export function ContentChannelSubnav({ contentId }: ContentChannelSubnavProps) {
  const pathname = usePathname();
  const base = `/content/${encodeURIComponent(contentId)}`;
  const links = [
    { href: `${base}/jobs`, label: '제작 아이템', prefix: `${base}/jobs` },
    { href: `${base}/queue`, label: '출고 큐', prefix: `${base}/queue` },
    { href: `${base}/schedule`, label: '예약·발행', prefix: `${base}/schedule` },
    { href: `${base}/connections`, label: '매체 연결', prefix: `${base}/connections` },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border pb-3 text-sm"
      aria-label="채널 하위 메뉴"
    >
      {links.map(({ href, label, prefix }) => {
        const active = pathname === prefix || pathname.startsWith(`${prefix}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? 'rounded-md bg-accent px-3 py-1.5 font-medium text-foreground'
                : 'rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
