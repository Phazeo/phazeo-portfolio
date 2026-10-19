/**
 * Import boundary tests. Each case builds a small tree in a temp dir and runs the checker on it.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { checkImportBoundaries } from "../../tools/checks/check-import-boundaries.ts";

type Tree = Record<string, string>;

function withTree(tree: Tree, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "phazeo-boundaries-test-"));
  try {
    for (const [rel, body] of Object.entries(tree)) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, body);
    }
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(tree: Tree): string[] {
  let errors: string[] = [];
  withTree(tree, (root) => {
    errors = checkImportBoundaries(root);
  });
  return errors;
}

function expectClean(tree: Tree): void {
  const errors = run(tree);
  assert.deepEqual(errors, [], errors.join("\n"));
}

function expectRule(tree: Tree, rule: number, file: string): void {
  const errors = run(tree);
  assert.ok(
    errors.some((e) => e.startsWith(`${file}:`) && e.includes(`violates rule ${rule}`)),
    `expected rule ${rule} for ${file}, got:\n${errors.join("\n") || "(none)"}`
  );
}

const KIT = { "src/kit/index.ts": "export const kit = 1;\n" };
const PROFILE_BASE: Tree = {
  ...KIT,
  "profiles/alpha-one/meta.ts": 'import { kit } from "#kit";\nexport const a = kit;\n',
  "profiles/alpha-one/v1/index.ts": "export const b = 1;\n",
  "profiles/beta-two/meta.ts": "export const c = 1;\n",
};

describe("import boundaries: rule 1 (profiles)", () => {
  it("passes for kit, own folder, and allowed packages", () => {
    expectClean({
      ...PROFILE_BASE,
      "profiles/alpha-one/v1/Page.tsx": [
        'import { useState } from "react";',
        'import { flushSync } from "react-dom";',
        'import { motion } from "motion/react";',
        'import "#kit/fonts/outfit-latin.css";',
        'import { b } from "./index";',
        'import { a } from "../meta";',
        "export const P = () => <p>{String(useState) + String(flushSync) + String(motion) + b + a}</p>;",
        "",
      ].join("\n"),
    });
  });

  it("fails for a disallowed package", () => {
    expectRule(
      { ...PROFILE_BASE, "profiles/alpha-one/v1/x.ts": 'import _ from "lodash";\nexport default _;\n' },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });

  it("fails for react-dom/client (exact list only)", () => {
    expectRule(
      {
        ...PROFILE_BASE,
        "profiles/alpha-one/v1/x.ts": 'import { createRoot } from "react-dom/client";\nexport default createRoot;\n',
      },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });

  it("fails for another profile folder", () => {
    expectRule(
      { ...PROFILE_BASE, "profiles/alpha-one/v1/x.ts": 'import { c } from "../../beta-two/meta";\nexport default c;\n' },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });

  it("fails for src outside the kit", () => {
    expectRule(
      {
        ...PROFILE_BASE,
        "src/registry/index.ts": "export const r = 1;\n",
        "profiles/alpha-one/v1/x.ts": 'import { r } from "../../../src/registry";\nexport default r;\n',
      },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });

  it("fails for dynamic imports of other packages", () => {
    expectRule(
      { ...PROFILE_BASE, "profiles/alpha-one/v1/x.ts": 'export const l = () => import("lodash");\n' },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });

  it("fails for re-exports from other packages", () => {
    expectRule(
      { ...PROFILE_BASE, "profiles/alpha-one/v1/x.ts": 'export { default } from "lodash";\n' },
      1,
      "profiles/alpha-one/v1/x.ts"
    );
  });
});

describe("import boundaries: rule 2 (kit)", () => {
  it("passes when kit imports only itself and packages", () => {
    expectClean({
      ...KIT,
      "src/kit/a.tsx": 'import { useState } from "react";\nimport { kit } from "./index";\nexport const A = () => useState(kit);\n',
    });
  });

  for (const dir of ["app", "features/directory", "registry", "components"]) {
    it(`fails when kit imports src/${dir}`, () => {
      expectRule(
        {
          ...KIT,
          [`src/${dir}/thing.ts`]: "export const t = 1;\n",
          "src/kit/bad.ts": `import { t } from "../${dir}/thing";\nexport default t;\n`,
        },
        2,
        "src/kit/bad.ts"
      );
    });
  }
});

describe("import boundaries: rule 3 (features)", () => {
  const FEATURES: Tree = {
    "src/features/directory/a.ts": "export const a = 1;\n",
    "src/features/portfolio/b.ts": "export const b = 1;\n",
    "src/features/data-profile/c.ts": "export const c = 1;\n",
  };

  it("passes for same-feature, kit, app, registry, and component imports", () => {
    expectClean({
      ...FEATURES,
      ...KIT,
      "src/app/x.ts": "export const x = 1;\n",
      "src/registry/index.ts": "export const r = 1;\n",
      "src/components/y.ts": "export const y = 1;\n",
      "src/features/directory/d.ts": [
        'import { a } from "./a";',
        'import { kit } from "#kit";',
        'import { x } from "../../app/x";',
        'import { r } from "../../registry";',
        'import { y } from "../../components/y";',
        "export const d = [a, kit, x, r, y];",
        "",
      ].join("\n"),
    });
  });

  for (const [from, to] of [
    ["directory", "portfolio"],
    ["portfolio", "data-profile"],
    ["data-profile", "directory"],
  ] as const) {
    it(`fails when ${from} imports ${to}`, () => {
      const target = to === "portfolio" ? "b" : to === "data-profile" ? "c" : "a";
      expectRule(
        {
          ...FEATURES,
          [`src/features/${from}/bad.ts`]: `import { ${target} } from "../${to}/${target}";\nexport default ${target};\n`,
        },
        3,
        `src/features/${from}/bad.ts`
      );
    });
  }
});

describe("import boundaries: rule 4 (tools and tests)", () => {
  const OUTSIDE: Tree = {
    "tools/t.ts": "export const t = 1;\n",
    "tests/u.ts": "export const u = 1;\n",
  };

  it("passes when src and profiles do not touch tools or tests", () => {
    expectClean({ ...OUTSIDE, ...KIT, "src/app/ok.ts": 'import { kit } from "#kit";\nexport default kit;\n' });
  });

  it("fails when src imports tools", () => {
    expectRule(
      { ...OUTSIDE, "src/app/bad.ts": 'import { t } from "../../tools/t";\nexport default t;\n' },
      4,
      "src/app/bad.ts"
    );
  });

  it("fails when src imports tests", () => {
    expectRule(
      { ...OUTSIDE, "src/app/bad.ts": 'import { u } from "../../tests/u";\nexport default u;\n' },
      4,
      "src/app/bad.ts"
    );
  });

  it("fails when a profile imports tools", () => {
    expectRule(
      { ...OUTSIDE, "profiles/alpha-one/meta.ts": 'import { t } from "../../tools/t";\nexport default t;\n' },
      4,
      "profiles/alpha-one/meta.ts"
    );
  });

  it("fails when kit imports tests", () => {
    expectRule(
      { ...OUTSIDE, "src/kit/bad.ts": 'import { u } from "../../tests/u";\nexport default u;\n' },
      4,
      "src/kit/bad.ts"
    );
  });
});

describe("import boundaries: files option", () => {
  const TREE: Tree = {
    "src/kit/ok.ts": "export {};\n",
    "src/app/bad.ts": 'import { u } from "../../tests/u";\nexport default u;\n',
  };

  it("checks only the listed files (repo-relative)", () => {
    withTree(TREE, (root) => {
      assert.deepEqual(checkImportBoundaries(root, { files: ["src/kit/ok.ts"] }), []);
      const errors = checkImportBoundaries(root, { files: ["src/app/bad.ts"] });
      assert.equal(errors.length, 1);
      assert.match(errors[0] ?? "", /^src\/app\/bad\.ts: .*rule 4/);
    });
  });

  it("accepts absolute paths and an empty list", () => {
    withTree(TREE, (root) => {
      const errors = checkImportBoundaries(root, { files: [join(root, "src/app/bad.ts")] });
      assert.equal(errors.length, 1);
      assert.deepEqual(checkImportBoundaries(root, { files: [] }), []);
    });
  });
});

describe("import boundaries: real repository", () => {
  it("is clean", () => {
    const root = new URL("../..", import.meta.url).pathname;
    const errors = checkImportBoundaries(root);
    assert.deepEqual(errors, [], errors.join("\n"));
  });
});
