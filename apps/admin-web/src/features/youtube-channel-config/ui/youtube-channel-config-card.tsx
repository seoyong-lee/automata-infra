'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import {
  type YoutubeChannelConfig,
  useDeleteYoutubeChannelConfig,
  useUpsertYoutubeChannelConfig,
} from '@/entities/youtube-channel';

import { toYoutubeChannelConfigForm } from '../lib/toYoutubeChannelConfigForm';
import { type YoutubeChannelConfigForm } from '../model/form';
import { YoutubeChannelConfigActions } from './youtube-channel-config-actions';
import { YoutubeChannelConfigFields } from './youtube-channel-config-fields';
import { YoutubeChannelConfigMeta } from './youtube-channel-config-meta';

type YoutubeChannelConfigCardProps = {
  config?: YoutubeChannelConfig;
};

const createInputHandler =
  (setForm: Dispatch<SetStateAction<YoutubeChannelConfigForm>>) =>
  (key: keyof YoutubeChannelConfigForm) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({
      ...current,
      [key]:
        event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
          ? event.target.checked
          : event.target.value,
    }));
  };

export function YoutubeChannelConfigCard({ config }: YoutubeChannelConfigCardProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<YoutubeChannelConfigForm>(() =>
    toYoutubeChannelConfigForm(config),
  );
  const upsertMutation = useUpsertYoutubeChannelConfig({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['youtubeChannelConfigs'],
      });
    },
  });
  const deleteMutation = useDeleteYoutubeChannelConfig({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['youtubeChannelConfigs'],
      });
      setForm(toYoutubeChannelConfigForm());
    },
  });

  useEffect(() => {
    setForm(toYoutubeChannelConfigForm(config));
  }, [config]);

  const onInput = createInputHandler(setForm);

  const onSave = () => {
    upsertMutation.mutate({
      channelId: form.channelId,
      youtubeSecretName: form.youtubeSecretName,
      youtubeAccountType: form.youtubeAccountType || undefined,
      autoPublishEnabled: form.autoPublishEnabled,
      defaultVisibility: form.defaultVisibility,
      defaultCategoryId: form.defaultCategoryId ? Number(form.defaultCategoryId) : undefined,
      playlistId: form.playlistId || undefined,
    });
  };

  const onDelete = () => {
    if (!config) {
      return;
    }

    deleteMutation.mutate({ channelId: config.channelId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {config?.channelId ? `YouTube Channel: ${config.channelId}` : 'Add YouTube Channel'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <YoutubeChannelConfigFields form={form} onInput={onInput} />
        <YoutubeChannelConfigMeta config={config} />
        <YoutubeChannelConfigActions
          config={config}
          upsertPending={upsertMutation.isPending}
          deletePending={deleteMutation.isPending}
          onSave={onSave}
          onDelete={onDelete}
        />
        {upsertMutation.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(upsertMutation.error)}</p>
        ) : null}
        {deleteMutation.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(deleteMutation.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
