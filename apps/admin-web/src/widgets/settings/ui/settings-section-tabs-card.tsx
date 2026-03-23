import { Button } from '@packages/ui/button';
import { CloudCog, Mic2, PanelTop, RadioTower, Settings2, TerminalSquare, Workflow } from 'lucide-react';

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
  const iconBySection: Record<SettingsSection, typeof Settings2> = {
    general: Settings2,
    channels: Workflow,
    models: PanelTop,
    voices: Mic2,
    providers: CloudCog,
    'publish-policy': RadioTower,
    runtime: TerminalSquare,
  };

  return (
    <div className="space-y-8">
      <nav className="flex flex-col gap-1">
        {settingsSections.map((section) => {
          const Icon = iconBySection[section.key];
          return (
            <Button
              key={section.key}
              variant="ghost"
              className={
                activeSection === section.key
                  ? 'justify-between rounded-sm border-r-2 border-admin-primary bg-admin-surface-section px-4 py-6 font-semibold text-admin-primary hover:bg-admin-surface-section'
                  : 'justify-between rounded-md px-4 py-6 text-admin-text-muted hover:bg-admin-surface-section hover:text-admin-primary'
              }
              onClick={() => onSectionChange(section.key)}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                <span>{section.label}</span>
              </span>
              {activeSection === section.key ? <span className="text-xs">›</span> : null}
            </Button>
          );
        })}
      </nav>

      <div className="rounded-xl border border-admin-outline-ghost/20 bg-admin-surface-section p-6">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-admin-primary">
          Workspace Status
        </h4>
        <div className="mb-4 flex items-center gap-3">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-admin-text-strong">Engine: Online</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-admin-surface-card">
          <div className="h-full w-2/3 bg-admin-primary" />
        </div>
        <p className="mt-2 text-[10px] text-admin-text-muted">68% Quota remaining for current cycle</p>
      </div>

      <div className="rounded-xl border border-admin-outline-ghost/10 bg-admin-surface-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
          Active View
        </p>
        <p className="mt-2 text-sm leading-relaxed text-admin-text-muted">{activeDescription}</p>
      </div>
    </div>
  );
}
