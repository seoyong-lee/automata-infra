let _url: string | null = null;
let _getToken: (() => Promise<string | null> | string | null) | null = null;
let _onUnauthorized: (() => void) | null = null;

export const configureGraphqlClient = (args: {
  url: string;
  getToken?: (() => Promise<string | null> | string | null) | null;
  onUnauthorized?: (() => void) | null;
}) => {
  _url = args.url;
  _getToken = args.getToken ?? null;
  _onUnauthorized = args.onUnauthorized ?? null;
};

export const getGraphqlRuntime = () => {
  if (!_url) {
    throw new Error("GraphQL client is not configured.");
  }
  return {
    url: _url,
    getToken: _getToken,
    onUnauthorized: _onUnauthorized,
  };
};
