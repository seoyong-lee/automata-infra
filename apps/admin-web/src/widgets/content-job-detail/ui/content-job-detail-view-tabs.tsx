'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { WorkspaceView, workspaceViews } from '../model';

type ContentJobDetailViewTabsProps = {
  activeView: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
};

export function ContentJobDetailViewTabs({ activeView, onChange }: ContentJobDetailViewTabsProps) {
  const activeDescription = workspaceViews.find(
    (view: { key: WorkspaceView }) => view.key === activeView,
  )?.description;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Views</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {workspaceViews.map((view: { key: WorkspaceView } & { label: string }) => (
            <Button
              key={view.key}
              variant={activeView === view.key ? 'default' : 'outline'}
              onClick={() => onChange(view.key)}
            >
              {view.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{activeDescription}</p>
      </CardContent>
    </Card>
  );
}
