import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export type PublishAuthResources = {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
};

type CreatePublishAuthProps = {
  projectPrefix: string;
  domainPrefix: string;
  enableSignup: boolean;
  reviewUiDomain: string;
};

export const createPublishAuth = (
  scope: Construct,
  props: CreatePublishAuthProps,
): PublishAuthResources => {
  const userPool = new cognito.UserPool(scope, "AdminUserPool", {
    userPoolName: `${props.projectPrefix}-admin-users`,
    selfSignUpEnabled: props.enableSignup,
    signInAliases: {
      email: true,
    },
    standardAttributes: {
      email: {
        required: true,
        mutable: false,
      },
    },
    passwordPolicy: {
      minLength: 10,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    },
  });

  userPool.addDomain("AdminUserPoolDomain", {
    cognitoDomain: {
      domainPrefix: props.domainPrefix,
    },
  });

  const userPoolClient = userPool.addClient("AdminUserPoolClient", {
    userPoolClientName: `${props.projectPrefix}-admin-client`,
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
    generateSecret: false,
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
      },
      scopes: [
        cognito.OAuthScope.OPENID,
        cognito.OAuthScope.EMAIL,
        cognito.OAuthScope.PROFILE,
      ],
      callbackUrls: [`https://${props.reviewUiDomain}/auth/callback`],
      logoutUrls: [`https://${props.reviewUiDomain}/auth/logout`],
    },
  });

  new cognito.CfnUserPoolGroup(scope, "AdminGroup", {
    userPoolId: userPool.userPoolId,
    groupName: "Admin",
    description: "Admin reviewers for pipeline operations",
    precedence: 1,
  });

  return {
    userPool,
    userPoolClient,
  };
};
