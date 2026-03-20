import { Input } from '@packages/ui/input';
import type { ChangeEvent } from 'react';

import { type YoutubeChannelConfigForm } from '../model/form';

type YoutubeChannelConfigFieldsProps = {
  form: YoutubeChannelConfigForm;
  onInput: (
    key: keyof YoutubeChannelConfigForm,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

export function YoutubeChannelConfigFields({ form, onInput }: YoutubeChannelConfigFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm">
        <span className="font-medium">Channel ID</span>
        <Input value={form.channelId} onChange={onInput('channelId')} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Secret Name</span>
        <Input value={form.youtubeSecretName} onChange={onInput('youtubeSecretName')} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Account Type</span>
        <Input value={form.youtubeAccountType} onChange={onInput('youtubeAccountType')} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Default Visibility</span>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={form.defaultVisibility}
          onChange={onInput('defaultVisibility')}
        >
          <option value="private">private</option>
          <option value="unlisted">unlisted</option>
          <option value="public">public</option>
        </select>
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Default Category ID</span>
        <Input
          type="number"
          value={form.defaultCategoryId}
          onChange={onInput('defaultCategoryId')}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Playlist ID</span>
        <Input value={form.playlistId} onChange={onInput('playlistId')} />
      </label>
      <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={form.autoPublishEnabled}
          onChange={onInput('autoPublishEnabled')}
        />
        <span className="font-medium">Auto publish enabled</span>
      </label>
    </div>
  );
}
