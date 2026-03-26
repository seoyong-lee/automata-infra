import { putJsonToS3 } from "../../shared/lib/aws/runtime";
import { putJobMeta } from "../../shared/lib/store/video-jobs";
import { mapJobPlanJobMeta } from "../mapper/map-job-plan-job-meta";
import { JobPlanResult } from "../usecase/create-job-plan";

export const persistJobPlan = async (result: JobPlanResult): Promise<void> => {
  await putJsonToS3(result.jobPlanS3Key, result);
  await putJobMeta(mapJobPlanJobMeta(result));
};
