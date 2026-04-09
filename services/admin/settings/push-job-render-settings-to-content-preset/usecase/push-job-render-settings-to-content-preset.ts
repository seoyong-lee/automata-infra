import { jobRenderSettingsSchema } from "../../../../shared/lib/contracts/render-settings";
import {
  getContentPreset,
  putContentPreset,
} from "../../../../shared/lib/store/content-presets";
import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { mapContentPreset } from "../../../shared/mapper/map-content-preset";
import { badUserInput } from "../../../shared/errors";
import type { PushJobRenderSettingsToContentPresetArgs } from "../normalize/parse-push-job-render-settings-to-content-preset-args";

const isNonEmptyRenderPatch = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== "object") {
    return false;
  }
  return Object.keys(value as object).length > 0;
};

export const pushJobRenderSettingsToContentPreset = async (
  input: PushJobRenderSettingsToContentPresetArgs,
) => {
  const job = await getJobOrThrow(input.jobId);
  const [jobBrief, contentBrief] = await Promise.all([
    getStoredJobBrief(job),
    getStoredContentBrief(job),
  ]);

  if (!jobBrief) {
    throw badUserInput("Job brief is missing; cannot read render settings");
  }

  const presetId =
    input.presetId ?? jobBrief.presetId ?? contentBrief?.presetId ?? undefined;
  if (!presetId) {
    throw badUserInput(
      "presetId is required when the job and content briefs have no presetId",
    );
  }

  const preset = await getContentPreset(presetId);
  if (!preset) {
    throw badUserInput(`content preset not found: ${presetId}`);
  }

  const jobPatch = jobBrief.renderSettings;
  const resolvedFallback = jobBrief.resolvedPolicy?.renderSettings;
  const source = isNonEmptyRenderPatch(jobPatch) ? jobPatch : resolvedFallback;

  if (!isNonEmptyRenderPatch(source)) {
    throw badUserInput(
      "No render settings to save: set render options on the job (job brief) first, or ensure resolvedPolicy includes renderSettings",
    );
  }

  const base = preset.defaultPolicy.renderSettings ?? {};
  const mergedRaw = { ...base, ...source };
  const renderSettings = jobRenderSettingsSchema.parse(mergedRaw);

  const item = await putContentPreset({
    preset: {
      presetId: preset.presetId,
      name: preset.name,
      description: preset.description,
      isActive: preset.isActive,
      format: preset.format,
      duration: preset.duration,
      platformPresets: preset.platformPresets,
      styleTags: preset.styleTags,
      assetStrategy: preset.assetStrategy,
      capabilities: preset.capabilities,
      defaultPolicy: {
        ...preset.defaultPolicy,
        renderSettings,
      },
      promptOverrides: preset.promptOverrides,
    },
  });

  return mapContentPreset(item);
};
