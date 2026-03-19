import { Amplify } from "aws-amplify";
import { getAuthConfig } from "../config";

export const initCognito = () => {
  const { userPoolId, userPoolClientId } = getAuthConfig();
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
};
