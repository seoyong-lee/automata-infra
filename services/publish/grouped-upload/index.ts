import { Handler } from "aws-lambda";
import { run as completeSceneVideoUpload } from "./complete-scene-video-upload";
import { run as extractYoutubeTranscript } from "./extract-youtube-transcript";
import { run as requestAssetUpload } from "./request-asset-upload";
import { run as requestUpload } from "./request-upload";
import { run as uploadApi } from "../upload";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../../admin/shared/graphql-event";

type ApiGatewayUploadEvent = {
  body: string | null;
  headers?: Record<string, string | undefined>;
  httpMethod?: string;
  requestContext?: unknown;
};

const isApiGatewayUploadEvent = (
  event: GroupedGraphqlResolverEvent | ApiGatewayUploadEvent,
): event is ApiGatewayUploadEvent => {
  const maybe = event as ApiGatewayUploadEvent;
  return (
    typeof maybe.httpMethod === "string" ||
    typeof maybe.body === "string" ||
    maybe.body === null
  );
};

export const run: Handler<
  GroupedGraphqlResolverEvent | ApiGatewayUploadEvent,
  unknown
> = async (event) => {
  if (isApiGatewayUploadEvent(event) && !("info" in event)) {
    return uploadApi(event as never, {} as never, () => undefined);
  }

  const fieldName = getGroupedFieldName(event as GroupedGraphqlResolverEvent);
  switch (fieldName) {
    case "extractYoutubeTranscript":
      return extractYoutubeTranscript(
        event as GroupedGraphqlResolverEvent,
        {} as never,
        () => undefined,
      );
    case "completeSceneVideoUpload":
      return completeSceneVideoUpload(
        event as GroupedGraphqlResolverEvent,
        {} as never,
        () => undefined,
      );
    case "requestUpload":
      return requestUpload(
        event as GroupedGraphqlResolverEvent,
        {} as never,
        () => undefined,
      );
    case "requestAssetUpload":
      return requestAssetUpload(
        event as GroupedGraphqlResolverEvent,
        {} as never,
        () => undefined,
      );
    default:
      throw new Error(`Unsupported upload resolver: ${fieldName}`);
  }
};
