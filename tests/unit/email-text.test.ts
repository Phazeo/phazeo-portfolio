import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitEmail } from "../../src/kit/split-email.ts";

describe("splitEmail", () => {
  it("splits at the first @", () => {
    assert.deepEqual(splitEmail("ada@example.com"), {
      local: "ada",
      domain: "@example.com",
    });
  });

  it("returns the full string as local when there is no @", () => {
    assert.deepEqual(splitEmail("not-an-email"), { local: "not-an-email", domain: null });
  });
});
