#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import * as fs from "fs";
import { VideoFactoryEnvConfig } from "../lib/config";
import { PublishStack } from "../lib/publish-stack";
import { SharedStack } from "../lib/shared-stack";
import { WorkflowStack } from "../lib/workflow-stack";

const app = new App();

const envFile =
  (app.node.tryGetContext("@envFile") as string | undefined) ??
  "env/config.json";
let envConfig = {} as Partial<VideoFactoryEnvConfig>;

if (envFile && fs.existsSync(envFile)) {
  envConfig = JSON.parse(
    fs.readFileSync(envFile, "utf8"),
  ) as VideoFactoryEnvConfig;
}

const projectPrefix = envConfig.projectPrefix ?? "automata-studio";
const region = envConfig.region ?? "ap-northeast-2";

const resolvedEnvConfig: VideoFactoryEnvConfig = {
  region,
  projectPrefix,
  reviewUiDomain: envConfig.reviewUiDomain ?? "review.example.com",
  adminUserPoolDomainPrefix:
    envConfig.adminUserPoolDomainPrefix ?? `${projectPrefix}-admin-auth`,
  enableAdminSignup: envConfig.enableAdminSignup ?? false,
  workflowScheduleExpression:
    envConfig.workflowScheduleExpression ?? "rate(6 hours)",
  workflowScheduleEnabled: envConfig.workflowScheduleEnabled ?? true,
  channelId: envConfig.channelId ?? "history-en",
  defaultLanguage: envConfig.defaultLanguage ?? "en",
  enableFargateComposition: envConfig.enableFargateComposition ?? false,
  runwaySecretId: envConfig.runwaySecretId ?? `${projectPrefix}/runway`,
  openAiSecretId: envConfig.openAiSecretId ?? `${projectPrefix}/openai`,
  elevenLabsSecretId:
    envConfig.elevenLabsSecretId ?? `${projectPrefix}/elevenlabs`,
  shotstackSecretId:
    envConfig.shotstackSecretId ?? `${projectPrefix}/shotstack`,
  googleOAuthSecretId:
    envConfig.googleOAuthSecretId ?? `${projectPrefix}/google-oauth-admin`,
};

const sharedStack = new SharedStack(app, `${projectPrefix}-shared`, {
  projectPrefix,
  region,
  envConfig: resolvedEnvConfig,
});

const workflowStack = new WorkflowStack(app, `${projectPrefix}-workflow`, {
  projectPrefix,
  region,
  envConfig: resolvedEnvConfig,
  assetsBucket: sharedStack.assetsBucket,
  llmConfigTable: sharedStack.llmConfigTable,
  previewDistribution: sharedStack.previewDistribution,
});

new PublishStack(app, `${projectPrefix}-publish`, {
  projectPrefix,
  region,
  envConfig: resolvedEnvConfig,
  assetsBucket: sharedStack.assetsBucket,
  jobsTable: workflowStack.jobsTable,
  llmConfigTable: sharedStack.llmConfigTable,
  reviewQueue: workflowStack.reviewQueue,
  stateMachine: workflowStack.stateMachine,
});
