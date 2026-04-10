import {
  DescribeTasksCommand,
  type DescribeTasksCommandOutput,
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  type RunTaskCommandOutput,
} from "@aws-sdk/client-ecs";
import { getJsonFromS3, putJsonToS3 } from "../../aws/runtime";
import { setJobExecutionProviderTaskArn } from "../../store/job-execution";
import { pollUntil } from "../http/retry";

const region = process.env.AWS_REGION ?? "ap-northeast-2";
const ecsClient = new ECSClient({ region });

type FargateCompositionResult = Record<string, unknown> & {
  finalVideoS3Key: string;
  thumbnailS3Key: string;
  previewS3Key: string;
  provider: string;
  providerRenderId?: string | null;
  artifactsStored?: boolean;
  failed?: boolean;
  message?: string;
};

type FargateVoiceAdjustmentResult = Record<string, unknown> & {
  voiceS3Key: string;
  durationSec: number;
  provider: string;
  providerRenderId?: string | null;
  failed?: boolean;
  message?: string;
};

type FargateYoutubeTranscriptResult = Record<string, unknown> & {
  transcriptVttS3Key?: string;
  audioS3Key?: string;
  provider: string;
  languageCode?: string;
  sourceUrl?: string;
  extractionMode?: "SUBTITLES" | "AUDIO_FALLBACK";
  providerJobId?: string;
  providerRenderId?: string | null;
  failed?: boolean;
  message?: string;
};

const RESULT_KEY = (jobId: string) =>
  `logs/${jobId}/composition/fargate-result.json`;
const REQUEST_KEY = (jobId: string) =>
  `logs/${jobId}/composition/fargate-request.json`;
const VOICE_RESULT_KEY = (jobId: string, sceneId: number) =>
  `logs/${jobId}/voice-postprocess/scene-${sceneId}-result.json`;
const VOICE_REQUEST_KEY = (jobId: string, sceneId: number) =>
  `logs/${jobId}/voice-postprocess/scene-${sceneId}-request.json`;
const YOUTUBE_TRANSCRIPT_RESULT_KEY = (jobId: string, sceneId: number) =>
  `logs/${jobId}/youtube-transcript/scene-${sceneId}-result.json`;
const YOUTUBE_TRANSCRIPT_REQUEST_KEY = (jobId: string, sceneId: number) =>
  `logs/${jobId}/youtube-transcript/scene-${sceneId}-request.json`;
const STANDALONE_YOUTUBE_TRANSCRIPT_RESULT_KEY = (transcriptId: string) =>
  `logs/transcripts/${transcriptId}/youtube-transcript/result.json`;
const STANDALONE_YOUTUBE_TRANSCRIPT_REQUEST_KEY = (transcriptId: string) =>
  `logs/transcripts/${transcriptId}/youtube-transcript/request.json`;

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
};

/** Forwards Lambda env into the renderer container (RunTask overrides). */
const fargateDebugMp4BundleOverride = (): Array<{
  name: string;
  value: string;
}> => {
  const v = process.env.FARGATE_DEBUG_MP4_BUNDLE?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") {
    return [{ name: "FARGATE_DEBUG_MP4_BUNDLE", value: "1" }];
  }
  return [];
};

const getTaskConfig = () => {
  return {
    clusterArn: requireEnv("FARGATE_RENDER_CLUSTER_ARN"),
    taskDefinitionFamily: requireEnv("FARGATE_RENDER_TASK_DEFINITION_FAMILY"),
    containerName: requireEnv("FARGATE_RENDER_CONTAINER_NAME"),
    securityGroupId: requireEnv("FARGATE_RENDER_SECURITY_GROUP_ID"),
    subnetIds: requireEnv("FARGATE_RENDER_SUBNET_IDS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    timeoutMs: Number(process.env.FARGATE_RENDER_TIMEOUT_MS ?? "900000"),
  };
};

const getRenderPlanS3Key = (
  jobId: string,
  renderPlan: Record<string, unknown>,
) => {
  return typeof renderPlan.outputKey === "string" &&
    renderPlan.outputKey.trim().length > 0
    ? renderPlan.outputKey
    : `render-plans/${jobId}/render-plan.json`;
};

const getTaskArn = (payload: RunTaskCommandOutput) => {
  const taskArn = payload.tasks?.[0]?.taskArn;
  if (!taskArn) {
    throw new Error("Fargate render task was not created");
  }
  return taskArn;
};

const describeTask = async (clusterArn: string, taskArn: string) => {
  return ecsClient.send(
    new DescribeTasksCommand({
      cluster: clusterArn,
      tasks: [taskArn],
    }),
  );
};

const stopTask = async (
  clusterArn: string,
  taskArn: string,
  reason: string,
) => {
  await ecsClient.send(
    new StopTaskCommand({
      cluster: clusterArn,
      task: taskArn,
      reason,
    }),
  );
};

const getStoppedTask = (payload: DescribeTasksCommandOutput) =>
  payload.tasks?.[0];

const getStoppedContainer = (payload: DescribeTasksCommandOutput) =>
  getStoppedTask(payload)?.containers?.[0];

const getContainerExitError = (
  payload: DescribeTasksCommandOutput,
): string | undefined => {
  const task = getStoppedTask(payload);
  const container = getStoppedContainer(payload);
  if (typeof container?.exitCode !== "number" || container.exitCode === 0) {
    return undefined;
  }
  return (
    container.reason ??
    task?.stoppedReason ??
    `container exited with ${container.exitCode}`
  );
};

const getTaskStartError = (
  payload: DescribeTasksCommandOutput,
): string | undefined => {
  const task = getStoppedTask(payload);
  if (task?.stopCode !== "TaskFailedToStart") {
    return undefined;
  }
  return task.stoppedReason ?? "task failed to start";
};

const getTaskStopError = (
  payload: DescribeTasksCommandOutput,
): string | undefined => {
  return getContainerExitError(payload) ?? getTaskStartError(payload);
};

const waitForTask = async (
  clusterArn: string,
  taskArn: string,
  timeoutMs: number,
) => {
  return pollUntil({
    fetcher: () => describeTask(clusterArn, taskArn),
    isDone: (current) => current.tasks?.[0]?.lastStatus === "STOPPED",
    getStatus: (current) => current.tasks?.[0]?.lastStatus ?? "unknown",
    timeoutMs,
    intervalMs: 5000,
  });
};

const getTaskFailureReason = (failures?: Array<{ reason?: string | null }>) => {
  return failures
    ?.map((failure) => failure.reason)
    .filter(Boolean)
    .join(", ");
};

const launchFargateTask = async (input: {
  jobId: string;
  resultS3Key: string;
  containerEnvironment: Array<{ name: string; value: string }>;
}) => {
  const config = getTaskConfig();
  const launched = await ecsClient.send(
    new RunTaskCommand({
      cluster: config.clusterArn,
      taskDefinition: config.taskDefinitionFamily,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          securityGroups: [config.securityGroupId],
          subnets: config.subnetIds,
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: config.containerName,
            environment: [
              { name: "JOB_ID", value: input.jobId },
              { name: "RESULT_S3_KEY", value: input.resultS3Key },
              ...input.containerEnvironment,
            ],
          },
        ],
      },
    }),
  );
  const reason = getTaskFailureReason(launched.failures);
  if (reason) {
    throw new Error(
      `Failed to run Fargate render task${reason ? `: ${reason}` : ""}`,
    );
  }
  return {
    config,
    taskArn: getTaskArn(launched),
  };
};

const assertTaskCompleted = (
  taskState: DescribeTasksCommandOutput,
  result: Record<string, unknown>,
) => {
  const taskError = getTaskStopError(taskState);
  if (taskError) {
    const detail =
      typeof result.message === "string" && result.message.trim().length > 0
        ? result.message.trim()
        : taskError;
    throw new Error(`Fargate renderer failed: ${detail}`);
  }
  if (result.failed) {
    throw new Error(
      `Fargate renderer failed: ${
        typeof result.message === "string" && result.message.trim().length > 0
          ? result.message.trim()
          : "unknown renderer error"
      }`,
    );
  }
};

const runFargateTask = async (input: {
  jobId: string;
  executionSk?: string;
  resultS3Key: string;
  requestLogKey: string;
  requestPayload: Record<string, unknown>;
  containerEnvironment: Array<{ name: string; value: string }>;
}): Promise<{ result: Record<string, unknown>; taskArn: string }> => {
  await putJsonToS3(input.requestLogKey, input.requestPayload);
  const { config, taskArn } = await launchFargateTask({
    jobId: input.jobId,
    resultS3Key: input.resultS3Key,
    containerEnvironment: input.containerEnvironment,
  });
  if (input.executionSk) {
    await setJobExecutionProviderTaskArn({
      jobId: input.jobId,
      sk: input.executionSk,
      providerTaskArn: taskArn,
    });
  }
  const taskState = await waitForTask(
    config.clusterArn,
    taskArn,
    config.timeoutMs,
  );
  const result =
    (await getJsonFromS3<Record<string, unknown>>(input.resultS3Key)) ?? {};
  assertTaskCompleted(taskState, result);
  return {
    result,
    taskArn,
  };
};

export const composeWithFargate = async (input: {
  jobId: string;
  executionSk?: string;
  renderPlan: Record<string, unknown>;
}): Promise<FargateCompositionResult> => {
  const renderPlanS3Key = getRenderPlanS3Key(input.jobId, input.renderPlan);
  const resultS3Key = RESULT_KEY(input.jobId);
  await putJsonToS3(renderPlanS3Key, input.renderPlan);
  const { result, taskArn } = await runFargateTask({
    jobId: input.jobId,
    executionSk: input.executionSk,
    resultS3Key,
    requestLogKey: REQUEST_KEY(input.jobId),
    requestPayload: {
      renderPlanS3Key,
      resultS3Key,
      renderPlan: input.renderPlan,
    },
    containerEnvironment: [
      { name: "TASK_MODE", value: "RENDER" },
      { name: "RENDER_PLAN_S3_KEY", value: renderPlanS3Key },
      ...fargateDebugMp4BundleOverride(),
    ],
  });
  const typedResult = result as FargateCompositionResult;
  if (!typedResult.finalVideoS3Key) {
    throw new Error("Fargate renderer completed without a result payload");
  }
  return {
    ...typedResult,
    providerJobId: taskArn,
    providerRenderId: taskArn,
  };
};

export const stopFargateRenderTask = async (input: {
  taskArn: string;
  reason: string;
}): Promise<void> => {
  const config = getTaskConfig();
  await stopTask(config.clusterArn, input.taskArn, input.reason);
};

export const adjustVoiceWithFargate = async (input: {
  jobId: string;
  sceneId: number;
  inputVoiceS3Key: string;
  outputVoiceS3Key: string;
  targetDurationSec: number;
  inputDurationSec: number;
}): Promise<FargateVoiceAdjustmentResult> => {
  const resultS3Key = VOICE_RESULT_KEY(input.jobId, input.sceneId);
  const { result, taskArn } = await runFargateTask({
    jobId: input.jobId,
    resultS3Key,
    requestLogKey: VOICE_REQUEST_KEY(input.jobId, input.sceneId),
    requestPayload: {
      inputVoiceS3Key: input.inputVoiceS3Key,
      outputVoiceS3Key: input.outputVoiceS3Key,
      targetDurationSec: input.targetDurationSec,
      inputDurationSec: input.inputDurationSec,
      resultS3Key,
    },
    containerEnvironment: [
      { name: "TASK_MODE", value: "VOICE_POSTPROCESS" },
      { name: "INPUT_AUDIO_S3_KEY", value: input.inputVoiceS3Key },
      { name: "OUTPUT_AUDIO_S3_KEY", value: input.outputVoiceS3Key },
      { name: "TARGET_DURATION_SEC", value: String(input.targetDurationSec) },
      { name: "INPUT_DURATION_SEC", value: String(input.inputDurationSec) },
    ],
  });
  const typedResult = result as FargateVoiceAdjustmentResult;
  if (!typedResult.voiceS3Key || typeof typedResult.durationSec !== "number") {
    throw new Error(
      "Fargate voice postprocess completed without a result payload",
    );
  }
  return {
    ...typedResult,
    providerRenderId: taskArn,
  };
};

export const extractYoutubeTranscriptWithFargate = async (input: {
  jobId: string;
  sceneId: number;
  youtubeUrl: string;
  preferredLanguage?: string;
}): Promise<FargateYoutubeTranscriptResult> => {
  const resultS3Key = YOUTUBE_TRANSCRIPT_RESULT_KEY(input.jobId, input.sceneId);
  const { result, taskArn } = await runFargateTask({
    jobId: input.jobId,
    resultS3Key,
    requestLogKey: YOUTUBE_TRANSCRIPT_REQUEST_KEY(input.jobId, input.sceneId),
    requestPayload: {
      youtubeUrl: input.youtubeUrl,
      preferredLanguage: input.preferredLanguage,
      resultS3Key,
    },
    containerEnvironment: [
      { name: "TASK_MODE", value: "YOUTUBE_TRANSCRIPT" },
      { name: "SCENE_ID", value: String(input.sceneId) },
      { name: "YOUTUBE_URL", value: input.youtubeUrl },
      ...(input.preferredLanguage
        ? [{ name: "PREFERRED_LANGUAGE", value: input.preferredLanguage }]
        : []),
    ],
  });
  const typedResult = result as FargateYoutubeTranscriptResult;
  if (!typedResult.transcriptVttS3Key && !typedResult.audioS3Key) {
    throw new Error(
      "Fargate YouTube transcript task completed without a result payload",
    );
  }
  return {
    ...typedResult,
    providerRenderId: taskArn,
  };
};

export const extractStandaloneYoutubeTranscriptWithFargate = async (input: {
  transcriptId: string;
  youtubeUrl: string;
  preferredLanguage?: string;
}): Promise<FargateYoutubeTranscriptResult> => {
  const resultS3Key = STANDALONE_YOUTUBE_TRANSCRIPT_RESULT_KEY(
    input.transcriptId,
  );
  const { result, taskArn } = await runFargateTask({
    jobId: input.transcriptId,
    resultS3Key,
    requestLogKey: STANDALONE_YOUTUBE_TRANSCRIPT_REQUEST_KEY(
      input.transcriptId,
    ),
    requestPayload: {
      transcriptId: input.transcriptId,
      youtubeUrl: input.youtubeUrl,
      preferredLanguage: input.preferredLanguage,
      resultS3Key,
    },
    containerEnvironment: [
      { name: "TASK_MODE", value: "YOUTUBE_TRANSCRIPT" },
      { name: "TRANSCRIPT_ID", value: input.transcriptId },
      { name: "YOUTUBE_URL", value: input.youtubeUrl },
      ...(input.preferredLanguage
        ? [{ name: "PREFERRED_LANGUAGE", value: input.preferredLanguage }]
        : []),
    ],
  });
  const typedResult = result as FargateYoutubeTranscriptResult;
  if (!typedResult.transcriptVttS3Key && !typedResult.audioS3Key) {
    throw new Error(
      "Fargate YouTube transcript task completed without a result payload",
    );
  }
  return {
    ...typedResult,
    providerRenderId: taskArn,
  };
};
