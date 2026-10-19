import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type DirectoryEntry,
  buildDirectoryIndex,
  filterByType,
  filterDirectory,
  indexEntry,
  initialsFromName,
  matches,
  normalize,
  paginate,
  parseParams,
  sortByDisplayName,
  toParams,
  typeCountsFor,
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

const index = buildDirectoryIndex(entries);

describe("normalize", () => {
  it("lowercases, trims, and strips accents via NFKD", () => {
    assert.equal(normalize("  José  "), "jose");
    assert.equal(normalize("Äffin"), "affin");
    assert.equal(normalize("REACT"), "react");
  });
});

describe("matches", () => {
  it("empty query matches everything", () => {
    assert.equal(matches(index[0]!, ""), true);
    assert.equal(matches(index[0]!, "   "), true);
  });

  it("requires every word in name, role or skills", () => {
    const ada = index.find((e) => e.slug === "ada-lovelace")!;
    assert.equal(matches(ada, "ada"), true);
    assert.equal(matches(ada, "react"), true);
    assert.equal(matches(ada, "ada react"), true);
    assert.equal(matches(ada, "ada python"), false);
  });

  it("matches accented names via normalize", () => {
    const jose = index.find((e) => e.slug === "jose")!;
    assert.equal(matches(jose, "jose"), true);
    assert.equal(matches(jose, "garcía"), true);
    assert.equal(matches(jose, "garcia typescript"), true);
  });

  it("uses precomputed searchText", () => {
    const ada = index.find((e) => e.slug === "ada-lovelace")!;
    assert.ok(ada.searchText.includes("ada"));
    assert.ok(ada.searchText.includes("react"));
  });
});

describe("buildDirectoryIndex", () => {
  it("sorts once and preserves order through filterDirectory", () => {
    assert.deepEqual(
      index.map((e) => e.displayName),
      ["Ada Lovelace", "José García", "Zoe"]
    );
    const filtered = filterDirectory(index, "all", "a");
    assert.deepEqual(
      filtered.map((e) => e.slug),
      ["ada-lovelace", "jose"]
    );
  });

  it("typeCountsFor counts affiliations once", () => {
    assert.deepEqual(typeCountsFor(index), { all: 3, team: 2, guest: 1 });
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
    assert.equal(toParams({ q: "   ", type: "all", page: 1 }).toString(), "");
    assert.equal(
      toParams({ q: "  hi ", type: "guest", page: 3 }).toString(),
      "q=++hi+&type=guest&page=3"
    );
  });

  it("keeps trailing spaces through toParams then parseParams", () => {
    const q = "ada react ";
    const roundTrip = parseParams(toParams({ q, type: "all", page: 1 }));
    assert.equal(roundTrip.q, q);
  });
});

describe("initialsFromName", () => {
  it("handles accents, lowercase, extra spaces and emoji", () => {
    assert.equal(initialsFromName("ada lovelace"), "AL");
    assert.equal(initialsFromName("  José   García  "), "JG");
    assert.equal(initialsFromName("Élodie"), "É");
    assert.equal(initialsFromName("😀 Smile"), "😀S");
    assert.equal(initialsFromName("single"), "S");
  });
});

describe("scale: 10000 synthetic entries", () => {
  const big = Array.from({ length: 10000 }, (_, i) => {
    const n = String(i).padStart(5, "0");
    return {
      slug: `person-${n}`,
      displayName: `Person ${n}`,
      role: i % 2 === 0 ? "Engineer" : "Analyst",
      affiliation: (i % 3 === 0 ? "guest" : "team") as "team" | "guest",
      skills: i % 5 === 0 ? ["React", "Data"] : ["TypeScript"],
    };
  });
  const bigIndex = buildDirectoryIndex(big);

  it("preserves sorted order, filters and pages correctly", () => {
    assert.equal(bigIndex.length, 10000);
    for (let i = 1; i < bigIndex.length; i++) {
      assert.ok(
        bigIndex[i - 1]!.displayName.localeCompare(bigIndex[i]!.displayName, "en", {
          sensitivity: "base",
          numeric: true,
        }) <= 0
      );
    }

    const reactOnly = filterDirectory(bigIndex, "all", "react");
    assert.ok(reactOnly.length > 0);
    assert.ok(reactOnly.every((e) => e.searchText.includes("react")));
    for (let i = 1; i < reactOnly.length; i++) {
      const prev = bigIndex.findIndex((e) => e.slug === reactOnly[i - 1]!.slug);
      const next = bigIndex.findIndex((e) => e.slug === reactOnly[i]!.slug);
      assert.ok(prev < next, "filter preserves index order");
    }

    const guests = filterDirectory(bigIndex, "guest", "");
    assert.equal(guests.length, typeCountsFor(bigIndex).guest);

    const page2 = paginate(reactOnly, 2);
    assert.equal(page2.page, 2);
    assert.equal(page2.items.length, Math.min(20, Math.max(0, reactOnly.length - 20)));
    assert.deepEqual(page2.items, reactOnly.slice(20, 40));
  });

  it("reports one filter pass timing (informational)", () => {
    const t0 = performance.now();
    const out = filterDirectory(bigIndex, "all", "person 0042");
    const ms = performance.now() - t0;
    assert.ok(out.length >= 1);
    console.log(`directory filter 10000 entries: ${ms.toFixed(2)}ms (n=${out.length})`);
  });
});

describe("indexEntry", () => {
  it("attaches searchText", () => {
    const e = indexEntry(entries[0]!);
    assert.equal(e.searchText, normalize("Ada Lovelace Analyst Math React"));
  });
});
