import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export type PublishApiResources = {
  api: apigateway.RestApi;
};

export const createPublishApi = (
  scope: Construct,
  reviewHandler: lambda.IFunction,
  uploadHandler: lambda.IFunction,
): PublishApiResources => {
  const api = new apigateway.RestApi(scope, 'PublishApi', {
    restApiName: 'video-factory-publish-api',
    deployOptions: {
      stageName: 'api',
    },
  });

  const review = api.root.addResource('review');
  review.addMethod('POST', new apigateway.LambdaIntegration(reviewHandler));

  const upload = api.root.addResource('upload');
  upload.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler));

  return { api };
};
