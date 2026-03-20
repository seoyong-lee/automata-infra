import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { settingsSections, type SettingsSection } from '../model';

type SettingsSectionTabsCardProps = {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
};

export function SettingsSectionTabsCard({
  activeSection,
  onSectionChange,
}: SettingsSectionTabsCardProps) {
  const activeDescription =
    settingsSections.find((section) => section.key === activeSection)?.description ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {settingsSections.map((section) => (
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
