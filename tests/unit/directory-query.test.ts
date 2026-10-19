import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type DirectoryEntry,
  filterByType,
  matches,
  normalize,
  paginate,
  parseParams,
  sortByDisplayName,
  toParams,
} from "../../src/features/directory/query.ts";

const entries: DirectoryEntry[] = [
  {
    slug: "ada-lovelace",
    displayName: "Ada Lovelace",
    role: "Analyst",
    affiliation: "team",
    skills: ["Math", "React"],
  },
  {
    slug: "jose",
    displayName: "José García",
    role: "Engineer",
    affiliation: "guest",
    skills: ["TypeScript"],
  },
  {
    slug: "zoe",
    displayName: "Zoe",
    role: "Designer",
    affiliation: "team",
    skills: [],
  },
];

describe("normalize", () => {
  it("lowercases, trims, and strips accents via NFKD", () => {
    assert.equal(normalize("  José  "), "jose");
    assert.equal(normalize("Äffin"), "affin");
    assert.equal(normalize("REACT"), "react");
  });
});

describe("matches", () => {
  it("empty query matches everything", () => {
    assert.equal(matches(entries[0]!, ""), true);
    assert.equal(matches(entries[0]!, "   "), true);
  });

  it("requires every word in name, role or skills", () => {
    assert.equal(matches(entries[0]!, "ada"), true);
    assert.equal(matches(entries[0]!, "react"), true);
    assert.equal(matches(entries[0]!, "ada react"), true);
    assert.equal(matches(entries[0]!, "ada python"), false);
  });

  it("matches accented names via normalize", () => {
    assert.equal(matches(entries[1]!, "jose"), true);
    assert.equal(matches(entries[1]!, "garcía"), true);
    assert.equal(matches(entries[1]!, "garcia typescript"), true);
  });
});

describe("sortByDisplayName", () => {
  it("sorts ascending with shared en Collator", () => {
    const sorted = sortByDisplayName(entries);
    assert.deepEqual(
      sorted.map((e) => e.displayName),
      ["Ada Lovelace", "José García", "Zoe"]
    );
  });
});

describe("filterByType", () => {
  it("filters all, team, guest", () => {
    assert.equal(filterByType(entries, "all").length, 3);
    assert.equal(filterByType(entries, "team").length, 2);
    assert.equal(filterByType(entries, "guest").length, 1);
    assert.equal(filterByType(entries, "guest")[0]?.slug, "jose");
  });
});

describe("paginate", () => {
  it("clamps invalid page and handles empty list", () => {
    const empty = paginate([], 99);
    assert.deepEqual(empty, { items: [], page: 1, pageCount: 1 });

    const list = Array.from({ length: 5 }, (_, i) => ({ displayName: `N${i}`, id: i }));
    const low = paginate(list, 0);
    assert.equal(low.page, 1);
    assert.equal(low.items.length, 5);
    const high = paginate(list, 99);
    assert.equal(high.page, 1);
  });

  it("exactly 20 items: one page", () => {
    const list = Array.from({ length: 20 }, (_, i) => i);
    const r = paginate(list, 1);
    assert.equal(r.pageCount, 1);
    assert.equal(r.items.length, 20);
    assert.equal(r.page, 1);
  });

  it("41 items: three pages, clamps past end", () => {
    const list = Array.from({ length: 41 }, (_, i) => i);
    const p1 = paginate(list, 1);
    assert.equal(p1.pageCount, 3);
    assert.equal(p1.items.length, 20);
    const p2 = paginate(list, 2);
    assert.equal(p2.items.length, 20);
    const p3 = paginate(list, 3);
    assert.equal(p3.items.length, 1);
    const past = paginate(list, 9);
    assert.equal(past.page, 3);
    assert.equal(past.items.length, 1);
  });
});

describe("parseParams / toParams", () => {
  it("parses q, type, page and ignores invalid values", () => {
    assert.deepEqual(parseParams(new URLSearchParams("q=react&type=team&page=2")), {
      q: "react",
      type: "team",
      page: 2,
    });
    assert.deepEqual(parseParams(new URLSearchParams("type=nope&page=abc&page=-1")), {
      q: "",
      type: "all",
      page: 1,
    });
    assert.deepEqual(parseParams(new URLSearchParams("page=0")), {
      q: "",
      type: "all",
      page: 1,
    });
  });

  it("omits defaults from the URL", () => {
    assert.equal(toParams({ q: "", type: "all", page: 1 }).toString(), "");
    assert.equal(toParams({ q: "  hi ", type: "guest", page: 3 }).toString(), "q=hi&type=guest&page=3");
  });
});
