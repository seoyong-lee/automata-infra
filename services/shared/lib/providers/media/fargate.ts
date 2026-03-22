import {
  DescribeTasksCommand,
  type DescribeTasksCommandOutput,
  ECSClient,
  RunTaskCommand,
  type RunTaskCommandOutput,
} from "@aws-sdk/client-ecs";
import { getJsonFromS3, putJsonToS3 } from "../../aws/runtime";
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

const RESULT_KEY = (jobId: string) => `logs/${jobId}/composition/fargate-result.json`;
const REQUEST_KEY = (jobId: string) => `logs/${jobId}/composition/fargate-request.json`;

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
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

const getRenderPlanS3Key = (jobId: string, renderPlan: Record<string, unknown>) => {
  return typeof renderPlan.outputKey === "string" && renderPlan.outputKey.trim().length > 0
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

const getStoppedTask = (payload: DescribeTasksCommandOutput) => payload.tasks?.[0];

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

export const composeWithFargate = async (input: {
  jobId: string;
  renderPlan: Record<string, unknown>;
}): Promise<FargateCompositionResult> => {
  const config = getTaskConfig();
  const renderPlanS3Key = getRenderPlanS3Key(input.jobId, input.renderPlan);
  const resultS3Key = RESULT_KEY(input.jobId);
  await putJsonToS3(renderPlanS3Key, input.renderPlan);
  await putJsonToS3(REQUEST_KEY(input.jobId), {
    renderPlanS3Key,
    resultS3Key,
    renderPlan: input.renderPlan,
  });
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
              { name: "RENDER_PLAN_S3_KEY", value: renderPlanS3Key },
              { name: "RESULT_S3_KEY", value: resultS3Key },
            ],
          },
        ],
      },
    }),
  );
  if (launched.failures?.length) {
    const reason = launched.failures.map((failure) => failure.reason).filter(Boolean).join(", ");
    throw new Error(`Failed to run Fargate render task${reason ? `: ${reason}` : ""}`);
  }
  const taskArn = getTaskArn(launched);
  const taskState = await waitForTask(config.clusterArn, taskArn, config.timeoutMs);
  const result = await getJsonFromS3<FargateCompositionResult>(resultS3Key);
  const taskError = getTaskStopError(taskState);
  if (taskError) {
    const detail =
      result?.message && result.message.trim().length > 0
        ? result.message.trim()
        : taskError;
    throw new Error(`Fargate renderer failed: ${detail}`);
  }
  if (!result) {
    throw new Error("Fargate renderer completed without a result payload");
  }
  if (result.failed) {
    throw new Error(
      `Fargate renderer failed: ${result.message?.trim() || "unknown renderer error"}`,
    );
  }
  return {
    ...result,
    providerRenderId: taskArn,
  };
};
