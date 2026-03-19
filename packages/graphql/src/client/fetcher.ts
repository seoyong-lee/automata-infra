import { UnauthorizedError } from "./errors";

export const gqlFetch = async <TData>(args: {
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  token?: string | null;
}): Promise<TData> => {
  const res = await fetch(args.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(args.token ? { authorization: `Bearer ${args.token}` } : {}),
    },
    body: JSON.stringify({
      query: args.query,
      variables: args.variables,
    }),
  });

  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GraphQL HTTP ${res.status}${text ? `: ${text}` : ""}`);
  }

  const json = (await res.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message ?? "").join(" | ");
    if (/unauthorized|not authorized/i.test(msg)) {
      throw new UnauthorizedError(msg);
    }
    throw new Error(msg);
  }
  if (!json.data) {
    throw new Error("GraphQL returned no data");
  }
  return json.data;
};
