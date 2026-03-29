import { upsertSceneAsset } from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";

export const applySceneCandidateSelection = async <TCandidate>(input: {
  jobId: string;
  sceneId: number;
  candidateId: string;
  notFoundMessage: string;
  loadCandidate: (args: {
    jobId: string;
    sceneId: number;
    candidateId: string;
  }) => Promise<TCandidate | null | undefined>;
  buildPatch: (
    candidate: TCandidate,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
}) => {
  const candidate = await input.loadCandidate({
    jobId: input.jobId,
    sceneId: input.sceneId,
    candidateId: input.candidateId,
  });
  if (candidate === null || candidate === undefined) {
    throw notFound(input.notFoundMessage);
  }

  const patch = await input.buildPatch(candidate);
  await upsertSceneAsset(input.jobId, input.sceneId, patch);

  return getJobDraftView(input.jobId);
};
