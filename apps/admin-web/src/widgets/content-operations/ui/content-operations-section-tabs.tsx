'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { contentOperationsSections } from '../consts';
import type { ContentOperationsSectionKey } from '../model/types';

type Props = {
  activeSection: ContentOperationsSectionKey;
  onSectionChange: (section: ContentOperationsSectionKey) => void;
};

export function ContentOperationsSectionTabs({ activeSection, onSectionChange }: Props) {
  const activeDescription =
    contentOperationsSections.find((section) => section.key === activeSection)?.description ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {contentOperationsSections.map((section) => (
            <Button
              key={section.key}
              variant={activeSection === section.key ? 'default' : 'outline'}
              onClick={() => onSectionChange(section.key)}
            >
              {section.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{activeDescription}</p>
      </CardContent>
    </Card>
  );
}
