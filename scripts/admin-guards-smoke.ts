import { strict as assert } from "assert";
import { assertAdminGroup } from "../services/shared/lib/auth/admin-claims";

const run = () => {
  assert.doesNotThrow(() =>
    assertAdminGroup({
      claims: {
        "cognito:groups": ["Admin"],
      },
    }),
  );

  assert.throws(
    () =>
      assertAdminGroup({
        claims: {
          "cognito:groups": ["Viewer"],
        },
      }),
    /Admin group required/,
  );
};

run();
