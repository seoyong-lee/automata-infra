type AuthEvent = { type: "unauthorized" };

const listeners = new Set<(e: AuthEvent) => void>();

export const onAuthEvent = (cb: (e: AuthEvent) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const emitUnauthorized = () => {
  for (const cb of listeners) {
    cb({ type: "unauthorized" });
  }
};
