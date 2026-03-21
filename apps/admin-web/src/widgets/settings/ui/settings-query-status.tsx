import { getErrorMessage } from '@packages/utils';

type SettingsQueryStatusProps = {
  settingsLoading: boolean;
  settingsError: unknown;
  contentsLoading: boolean;
  contentsError: unknown;
};

export function SettingsQueryStatus({
  settingsLoading,
  settingsError,
  contentsLoading,
  contentsError,
}: SettingsQueryStatusProps) {
  return (
    <>
      {settingsLoading ? (
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      ) : null}
      {settingsError ? (
        <p className="text-sm text-destructive">{getErrorMessage(settingsError)}</p>
      ) : null}
      {contentsLoading ? (
        <p className="text-sm text-muted-foreground">채널 목록을 불러오는 중…</p>
      ) : null}
      {contentsError ? (
        <p className="text-sm text-destructive">{getErrorMessage(contentsError)}</p>
      ) : null}
    </>
  );
}
