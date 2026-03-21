import {
  finishJobExecution,
  markJobExecutionRunning,
  type JobExecutionStageType,
} from "../../../shared/lib/store/job-execution";
import { runAssetGenerationCore } from "../../graphql/run-asset-generation/usecase/run-asset-generation";
import { runSceneJsonCore } from "../../graphql/run-scene-json/usecase/run-scene-json";
import { runTopicPlanCore } from "../../graphql/run-topic-plan/usecase/run-topic-plan";

export const runPipelineStage = async (input: {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
}): Promise<void> => {
  await markJobExecutionRunning(input.jobId, input.executionSk);
  try {
    if (input.stage === "TOPIC_PLAN") {
      await runTopicPlanCore(input.jobId);
    } else if (input.stage === "SCENE_JSON") {
      await runSceneJsonCore(input.jobId);
    } else {
      await runAssetGenerationCore(input.jobId);
    }
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.executionSk,
      status: "SUCCEEDED",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.executionSk,
      status: "FAILED",
      errorMessage: msg,
    });
  }
};
