import { stopFargateRenderTask } from "../../../../shared/lib/providers/media";
import {
  cancelJobExecution,
  getJobExecutionByExecutionId,
  listJobExecutionRows,
} from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { conflict, notFound } from "../../../shared/errors";

const resolveTargetExecution = async (input: {
  jobId: string;
  executionId?: string;
}) => {
  if (input.executionId) {
    return getJobExecutionByExecutionId(input.jobId, input.executionId);
  }
  const rows = await listJobExecutionRows(input.jobId);
  return (
    rows.find(
      (row) =>
        row.stageType === "FINAL_COMPOSITION" &&
        (row.status === "RUNNING" || row.status === "QUEUED"),
    ) ?? null
  );
};

export const cancelFinalCompositionUsecase = async (
  input: {
    jobId: string;
    executionId?: string;
  },
  actor?: string,
) => {
  const execution = await resolveTargetExecution(input);
  if (!execution) {
    throw notFound("running final composition not found");
  }
  if (execution.stageType !== "FINAL_COMPOSITION") {
    throw conflict("execution is not a final composition run");
  }
  if (execution.status !== "RUNNING" && execution.status !== "QUEUED") {
    throw conflict("final composition is not cancellable");
  }

  const message = `final composition cancelled by ${actor ?? "unknown"}`;
  if (execution.status === "RUNNING") {
    if (!execution.providerTaskArn) {
      throw conflict("render task is not ready to cancel yet; retry shortly");
    }
    await stopFargateRenderTask({
      taskArn: execution.providerTaskArn,
      reason: message,
    });
  }

  await cancelJobExecution({
    jobId: input.jobId,
    sk: execution.SK,
    errorMessage: message,
  });
  await updateJobMeta(
    input.jobId,
    {
      lastError: message,
    },
    "RENDER_PLAN_READY",
  );
  return mapJobMetaToAdminJob(await getJobOrThrow(input.jobId));
};
