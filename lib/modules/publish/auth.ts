import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export type PublishAuthResources = {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
};

type CreatePublishAuthProps = {
  projectPrefix: string;
  domainPrefix: string;
  enableSignup: boolean;
  callbackUrls: string[];
  logoutUrls: string[];
  googleOAuthSecretId?: string;
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

  const hasGoogleIdp = Boolean(props.googleOAuthSecretId);

  const userPoolClient = userPool.addClient("AdminUserPoolClient", {
    userPoolClientName: `${props.projectPrefix}-admin-client`,
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
    generateSecret: false,
    supportedIdentityProviders: hasGoogleIdp
      ? [
          cognito.UserPoolClientIdentityProvider.COGNITO,
          cognito.UserPoolClientIdentityProvider.GOOGLE,
        ]
      : [cognito.UserPoolClientIdentityProvider.COGNITO],
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
      },
      scopes: [
        cognito.OAuthScope.OPENID,
        cognito.OAuthScope.EMAIL,
        cognito.OAuthScope.PROFILE,
      ],
      callbackUrls: props.callbackUrls,
      logoutUrls: props.logoutUrls,
    },
  });

  if (props.googleOAuthSecretId) {
    const googleOAuthSecret = secretsmanager.Secret.fromSecretNameV2(
      scope,
      "AdminGoogleOAuthSecret",
      props.googleOAuthSecretId,
    );
    const googleProvider = new cognito.CfnUserPoolIdentityProvider(
      scope,
      "AdminGoogleIdentityProvider",
      {
        userPoolId: userPool.userPoolId,
        providerName: "Google",
        providerType: "Google",
        providerDetails: {
          client_id: googleOAuthSecret
            .secretValueFromJson("clientId")
            .unsafeUnwrap(),
          client_secret: googleOAuthSecret
            .secretValueFromJson("clientSecret")
            .unsafeUnwrap(),
          authorize_scopes: googleOAuthSecret
            .secretValueFromJson("scopes")
            .unsafeUnwrap(),
        },
        attributeMapping: {
          email: "email",
          given_name: "given_name",
          family_name: "family_name",
          username: "sub",
        },
      },
    );
    userPoolClient.node.addDependency(googleProvider);
  }

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
