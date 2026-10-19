import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSlugList, SLUG_MAX_LEN, validateSlug } from "../../src/registry/slug.ts";

const lists = {
  reserved: parseSlugList("# comment\nadmin-panel\n"),
  retired: parseSlugList("old-name\n"),
};

describe("validateSlug", () => {
  it("accepts a normal slug", () => {
    assert.deepEqual(validateSlug("sriram-sm", lists), []);
  });

  it("rejects single-part, uppercase, and overlong slugs", () => {
    assert.ok(validateSlug("sriram", lists).length > 0);
    assert.ok(validateSlug("Sriram-sm", lists).length > 0);
    assert.ok(validateSlug(`a-${"b".repeat(SLUG_MAX_LEN)}`, lists).length > 0);
  });

  it("rejects reserved and retired slugs and includes the path hint", () => {
    assert.match(validateSlug("admin-panel", lists, "x/y")[0] ?? "", /reserved.*x\/y/);
    assert.match(validateSlug("old-name", lists)[0] ?? "", /retired/);
  });
});
