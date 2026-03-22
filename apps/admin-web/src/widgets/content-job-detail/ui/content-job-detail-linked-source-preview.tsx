'use client';

import type { SourceItemGql } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';

type Props = {
  linked: SourceItemGql;
};

export function ContentJobDetailLinkedSourcePreview({ linked }: Props) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{linked.topic}</span>
        <Badge variant="secondary" className="font-normal">
          {linked.status}
        </Badge>
      </div>
      {linked.masterHook ? (
        <p className="text-muted-foreground">
          <span className="text-xs font-medium text-foreground">핵심 훅</span> · {linked.masterHook}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground font-mono">ID {linked.id}</p>
      <p className="text-xs text-muted-foreground">
        생성 {new Date(linked.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
