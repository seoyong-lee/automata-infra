import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export const createObservabilityDashboard = (
  scope: Construct,
  projectPrefix: string,
): cloudwatch.Dashboard => {
  return new cloudwatch.Dashboard(scope, 'OperationsDashboard', {
    dashboardName: `${projectPrefix}-ops`,
  });
};
