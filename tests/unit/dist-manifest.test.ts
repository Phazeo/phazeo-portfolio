import assert from "node:assert/strict";
import { test } from "node:test";
import { compareManifests } from "../../tools/lib/dist-manifest.ts";

test("identical manifests", () => {
  const m = [
    { path: "a.js", sha256: "1" },
    { path: "b.css", sha256: "2" },
  ];
  const r = compareManifests(m, m);
  assert.equal(r.identical, true);
  assert.equal(r.sameContentSets, true);
});

test("renamed file with same content has equal content sets", () => {
  const r = compareManifests(
    [{ path: "assets/x-aaa.js", sha256: "1" }],
    [{ path: "assets/x-bbb.js", sha256: "1" }]
  );
  assert.equal(r.identical, false);
  assert.equal(r.sameContentSets, true);
  assert.equal(r.pathDiffs.length, 2);
});

test("changed content fails both checks", () => {
  const r = compareManifests([{ path: "a.js", sha256: "1" }], [{ path: "a.js", sha256: "2" }]);
  assert.equal(r.identical, false);
  assert.equal(r.sameContentSets, false);
  assert.equal(r.contentDiffs.length, 2);
});

test("duplicate contents are counted as a multiset", () => {
  const r = compareManifests(
    [
      { path: "a", sha256: "1" },
      { path: "b", sha256: "1" },
    ],
    [
      { path: "a", sha256: "1" },
      { path: "b", sha256: "2" },
    ]
  );
  assert.equal(r.sameContentSets, false);
});
