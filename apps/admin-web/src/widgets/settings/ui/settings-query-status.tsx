import { getErrorMessage } from "@packages/utils";

type SettingsQueryStatusProps = {
  settingsLoading: boolean;
  settingsError: unknown;
  youtubeConfigsLoading: boolean;
  youtubeConfigsError: unknown;
};

export function SettingsQueryStatus({
  settingsLoading,
  settingsError,
  youtubeConfigsLoading,
  youtubeConfigsError,
}: SettingsQueryStatusProps) {
  return (
    <>
      {settingsLoading ? (
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      ) : null}
      {settingsError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(settingsError)}
        </p>
      ) : null}
      {youtubeConfigsLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading YouTube channels...
        </p>
      ) : null}
      {youtubeConfigsError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(youtubeConfigsError)}
        </p>
      ) : null}
    </>
  );
}
