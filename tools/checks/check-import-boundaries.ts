#!/usr/bin/env node
/**
 * Import boundary check for src/ and profiles/.
 *
 * Rules:
 *  1. profiles/<slug>/* may import only: files inside the same slug folder, "#kit" / "#kit/*",
 *     and the packages in PROFILE_ALLOWED_PACKAGES.
 *  2. src/kit/* must not import from src/app, src/features, src/registry, or src/components.
 *  3. A feature (src/features/<name>) must not import another feature.
 *  4. Nothing under src/ or profiles/ may import tools/ or tests/.
 *
 * Parsing uses the TypeScript compiler API (typescript/unstable/sync): each file is parsed by the
 * real compiler and its import specifiers (static, re-export, dynamic, import-equals) are read
 * from the source file. Module resolution is disabled; only specifiers are inspected.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { API } from "typescript/unstable/sync";

/** Bare specifiers profiles may import (exact match). */
export const PROFILE_ALLOWED_PACKAGES: readonly string[] = [
  "react",
  "react-dom",
  "motion",
  "motion/react",
];

const SOURCE_FILE_RE = /\.(?:ts|tsx|mts|cts)$/;
const SCAN_DIRS = ["src", "profiles"] as const;

type Zone =
  | { kind: "profile"; slug: string }
  | { kind: "kit" }
  | { kind: "app" }
  | { kind: "registry" }
  | { kind: "components" }
  | { kind: "feature"; name: string }
  | { kind: "tools" }
  | { kind: "tests" }
  | { kind: "other" };

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function zoneOf(relPath: string): Zone {
  const parts = relPath.split("/");
  const [top, second] = parts;
  if (top === "profiles" && second && parts.length > 2) return { kind: "profile", slug: second };
  if (top === "tools") return { kind: "tools" };
  if (top === "tests") return { kind: "tests" };
  if (top === "src") {
    if (second === "kit") return { kind: "kit" };
    if (second === "app") return { kind: "app" };
    if (second === "registry") return { kind: "registry" };
    if (second === "components") return { kind: "components" };
    if (second === "features" && parts[2] && parts.length > 3) {
      return { kind: "feature", name: parts[2] };
    }
  }
  return { kind: "other" };
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist") continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, out);
    } else if (SOURCE_FILE_RE.test(ent.name)) {
      out.push(abs);
    }
  }
}

function isRelative(spec: string): boolean {
  return spec === "." || spec === ".." || spec.startsWith("./") || spec.startsWith("../");
}

function isKitSpecifier(spec: string): boolean {
  return spec === "#kit" || spec.startsWith("#kit/");
}

function describeZone(z: Zone): string {
  switch (z.kind) {
    case "feature":
      return `src/features/${z.name}`;
    case "profile":
      return `profiles/${z.slug}`;
    case "kit":
      return "src/kit";
    case "app":
      return "src/app";
    case "registry":
      return "src/registry";
    case "components":
      return "src/components";
    case "tools":
      return "tools";
    case "tests":
      return "tests";
    default:
      return "src";
  }
}

/** Violations for one import specifier in one file (empty when allowed). */
function checkSpecifier(
  root: string,
  fileRel: string,
  fileAbs: string,
  spec: string,
  from: Zone
): string[] {
  const errors: string[] = [];
  const fail = (rule: number, msg: string): void => {
    errors.push(`${fileRel}: import "${spec}" violates rule ${rule}: ${msg}`);
  };

  let target: Zone | undefined;
  let targetRel = "";
  if (isRelative(spec)) {
    const abs = resolve(dirname(fileAbs), spec);
    targetRel = toPosix(relative(root, abs));
    target = targetRel.startsWith("..") ? { kind: "other" } : zoneOf(targetRel);
  }

  // Rule 4: nothing in src/ or profiles/ may reach tools/ or tests/.
  if (target && (target.kind === "tools" || target.kind === "tests")) {
    fail(4, `src/ and profiles/ must not import ${describeZone(target)}/`);
    return errors;
  }

  if (from.kind === "profile") {
    // Rule 1.
    if (isRelative(spec)) {
      const sameSlug = target?.kind === "profile" && target.slug === from.slug;
      if (!sameSlug) {
        fail(1, `profiles/${from.slug} may only import its own folder (found ${targetRel})`);
      }
    } else if (isKitSpecifier(spec)) {
      // allowed
    } else if (spec.startsWith("#")) {
      fail(1, `unknown package import alias; only "#kit" and "#kit/*" are allowed`);
    } else if (!PROFILE_ALLOWED_PACKAGES.includes(spec)) {
      fail(1, `package not allowed in profiles (allowed: ${PROFILE_ALLOWED_PACKAGES.join(", ")})`);
    }
    return errors;
  }

  if (from.kind === "kit" && target) {
    // Rule 2.
    if (
      target.kind === "app" ||
      target.kind === "feature" ||
      target.kind === "registry" ||
      target.kind === "components"
    ) {
      fail(2, `src/kit must not import ${describeZone(target)}`);
    }
    return errors;
  }

  if (from.kind === "feature" && target?.kind === "feature" && target.name !== from.name) {
    // Rule 3.
    fail(3, `${describeZone(from)} must not import ${describeZone(target)}`);
  }

  return errors;
}

/**
 * Check every .ts/.tsx file under <root>/src and <root>/profiles.
 * Returns one message per violation (empty array when clean).
 */
export function checkImportBoundaries(root: string): string[] {
  const absRoot = resolve(root);
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(join(absRoot, dir), files);
  if (files.length === 0) return [];

  const tmp = mkdtempSync(join(tmpdir(), "phazeo-import-boundaries-"));
  const tsconfig = join(tmp, "tsconfig.json");
  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        jsx: "react-jsx",
        module: "esnext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        noEmit: true,
        noResolve: true,
        skipLibCheck: true,
        types: [],
        lib: ["es2022"],
      },
      files: files.sort(),
    })
  );

  const errors: string[] = [];
  const api = new API({ cwd: absRoot });
  try {
    const snapshot = api.updateSnapshot({ openProject: tsconfig });
    const project = snapshot.getProjects()[0];
    if (!project) {
      throw new Error("check-import-boundaries: TypeScript project failed to load");
    }
    for (const fileAbs of files) {
      const sf = project.program.getSourceFile(fileAbs);
      if (!sf) {
        errors.push(`${toPosix(relative(absRoot, fileAbs))}: could not be parsed`);
        continue;
      }
      const fileRel = toPosix(relative(absRoot, fileAbs));
      const from = zoneOf(fileRel);
      const seen = new Set<string>();
      for (const node of sf.imports) {
        const spec = "text" in node && typeof node.text === "string" ? node.text : undefined;
        if (spec === undefined || seen.has(spec)) continue;
        seen.add(spec);
        errors.push(...checkSpecifier(absRoot, fileRel, fileAbs, spec, from));
      }
    }
  } finally {
    api.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  return errors;
}

function main(): void {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const errors = checkImportBoundaries(root);
  if (errors.length > 0) {
    console.error("check-imports: FAILED");
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("check-imports: OK");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
