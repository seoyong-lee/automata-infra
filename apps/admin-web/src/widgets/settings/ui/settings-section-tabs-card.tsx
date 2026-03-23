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
    <Card className="border-admin-outline-ghost bg-admin-surface-card shadow-sm">
      <CardHeader className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-primary">
          Console
        </div>
        <CardTitle className="font-admin-display text-2xl font-extrabold tracking-tight text-admin-primary">
          설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1">
          {settingsSections.map((section) => (
            <Button
              key={section.key}
              variant="ghost"
              className={
                activeSection === section.key
                  ? 'justify-between rounded-md bg-admin-surface-section px-4 py-6 text-admin-primary hover:bg-admin-surface-section'
                  : 'justify-between rounded-md px-4 py-6 text-admin-text-muted hover:bg-admin-surface-section hover:text-admin-primary'
              }
              onClick={() => onSectionChange(section.key)}
            >
              {section.label}
            </Button>
          ))}
        </div>
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-section p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-primary">
            현재 섹션
          </p>
          <p className="mt-2 text-sm leading-relaxed text-admin-text-muted">{activeDescription}</p>
        </div>
      </CardContent>
    </Card>
  );
}
