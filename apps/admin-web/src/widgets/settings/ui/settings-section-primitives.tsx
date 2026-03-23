import { cn } from '@packages/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { ReactNode } from 'react';

const baseCardClassName = 'border-admin-outline-ghost shadow-sm';

type SettingsSectionIntroProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
};

export function SettingsSectionIntro({
  eyebrow,
  title,
  description,
  aside,
}: SettingsSectionIntroProps) {
  return (
    <Card className={cn(baseCardClassName, 'bg-admin-surface-card')}>
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-primary">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h2 className="font-admin-display text-2xl font-extrabold tracking-tight text-admin-primary">
              {title}
            </h2>
            <div className="max-w-3xl text-sm leading-6 text-admin-text-muted">{description}</div>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </CardContent>
    </Card>
  );
}

type SettingsSectionCardProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  tone?: 'card' | 'section';
};

export function SettingsSectionCard({
  title,
  description,
  eyebrow,
  children,
  className,
  tone = 'card',
}: SettingsSectionCardProps) {
  return (
    <Card
      className={cn(
        baseCardClassName,
        tone === 'section' ? 'bg-admin-surface-section/70 shadow-none' : 'bg-admin-surface-card',
        className,
      )}
    >
      <CardHeader className="space-y-2">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="text-base text-admin-text-strong">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-6 text-admin-text-muted">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type SettingsStatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
};

export function SettingsStatCard({ label, value, hint }: SettingsStatCardProps) {
  return (
    <Card className={cn(baseCardClassName, 'bg-admin-surface-section/70 shadow-none')}>
      <CardContent className="space-y-2 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
          {label}
        </p>
        <p className="text-3xl font-semibold tabular-nums text-admin-text-strong">{value}</p>
        {hint ? <p className="text-sm text-admin-text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
