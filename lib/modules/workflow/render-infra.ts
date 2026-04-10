import * as path from "path";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecrassets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export type WorkflowRenderInfrastructure = {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  taskDefinition: ecs.FargateTaskDefinition;
  taskDefinitionFamily: string;
  securityGroup: ec2.SecurityGroup;
  containerName: string;
  logGroup: logs.LogGroup;
};

type CreateWorkflowRenderInfrastructureProps = {
  projectPrefix: string;
  assetsBucket: s3.Bucket;
};

export const createWorkflowRenderInfrastructure = (
  scope: Construct,
  props: CreateWorkflowRenderInfrastructureProps,
): WorkflowRenderInfrastructure => {
  const vpc = new ec2.Vpc(scope, "FargateRenderVpc", {
    maxAzs: 2,
    natGateways: 0,
    subnetConfiguration: [
      {
        cidrMask: 24,
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ],
  });
  const cluster = new ecs.Cluster(scope, "FargateRenderCluster", {
    clusterName: `${props.projectPrefix}-render-cluster`,
    vpc,
  });
  const securityGroup = new ec2.SecurityGroup(
    scope,
    "FargateRenderTaskSecurityGroup",
    {
      vpc,
      allowAllOutbound: true,
      description: "Security group for FFmpeg render tasks",
    },
  );
  const taskDefinition = new ecs.FargateTaskDefinition(
    scope,
    "FargateRenderTaskDefinition",
    {
      family: `${props.projectPrefix}-fargate-renderer`,
      cpu: 2048,
      memoryLimitMiB: 4096,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    },
  );
  const containerName = "renderer";
  const logGroup = new logs.LogGroup(scope, "FargateRenderLogGroup", {
    logGroupName: `/aws/ecs/${props.projectPrefix}-fargate-renderer`,
  });
  taskDefinition.addContainer("RendererContainer", {
    containerName,
    image: ecs.ContainerImage.fromAsset(process.cwd(), {
      file: path.join(
        "services",
        "composition",
        "fargate-renderer",
        "Dockerfile",
      ),
      platform: ecrassets.Platform.LINUX_AMD64,
      // Repo-root context: exclude .git so CDK hashing does not race on .git/index.lock (ENOENT during synth/deploy).
      exclude: [
        ".git",
        "cdk.out",
        "cdk.out-ts",
        "node_modules",
        ".cursor",
      ],
    }),
    logging: ecs.LogDrivers.awsLogs({
      logGroup,
      streamPrefix: "ffmpeg-renderer",
    }),
    environment: {
      ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
    },
  });
  props.assetsBucket.grantReadWrite(taskDefinition.taskRole);
  return {
    vpc,
    cluster,
    taskDefinition,
    taskDefinitionFamily: `${props.projectPrefix}-fargate-renderer`,
    securityGroup,
    containerName,
    logGroup,
  };
};
