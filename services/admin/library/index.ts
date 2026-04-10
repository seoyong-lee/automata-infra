import { Handler } from "aws-lambda";
import { run as assetPoolAssets } from "./asset-pool-assets";
import { run as registerAssetPoolAsset } from "./register-asset-pool-asset";
import { run as requestLibraryBgmUpload } from "./request-library-bgm-upload";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  assetPoolAssets,
  registerAssetPoolAsset,
  requestLibraryBgmUpload,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "library");
};
