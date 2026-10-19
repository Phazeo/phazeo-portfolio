/**
 * Dist manifests: relative file path plus SHA-256 for every file under a folder,
 * and a comparer that tolerates renamed (content-hashed) files when the
 * multiset of file contents is identical.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type DistFile = { path: string; sha256: string };

export type ManifestComparison = {
  /** Same paths with same hashes. */
  identical: boolean;
  /** Paths differ but the multiset of content hashes is equal. */
  sameContentSets: boolean;
  /** Path in only one side, or hash differs for the same path. */
  pathDiffs: string[];
  /** Content hashes whose count differs between sides. */
  contentDiffs: string[];
};

export function sha256Of(buf: Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function buildManifest(dir: string): DistFile[] {
  const out: DistFile[] = [];
  const walk = (rel: string): void => {
    for (const ent of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const next = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(next);
      } else if (ent.isFile()) {
        out.push({ path: next, sha256: sha256Of(readFileSync(join(dir, next))) });
      }
    }
  };
  walk("");
  out.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
  return out;
}

function countHashes(files: readonly DistFile[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of files) m.set(f.sha256, (m.get(f.sha256) ?? 0) + 1);
  return m;
}

export function compareManifests(
  base: readonly DistFile[],
  head: readonly DistFile[]
): ManifestComparison {
  const baseByPath = new Map(base.map((f) => [f.path, f.sha256]));
  const headByPath = new Map(head.map((f) => [f.path, f.sha256]));
  const pathDiffs: string[] = [];
  for (const [path, hash] of baseByPath) {
    const other = headByPath.get(path);
    if (other === undefined) pathDiffs.push(`only in BASE: ${path} (${hash})`);
    else if (other !== hash) pathDiffs.push(`hash differs: ${path} BASE=${hash} HEAD=${other}`);
  }
  for (const [path, hash] of headByPath) {
    if (!baseByPath.has(path)) pathDiffs.push(`only in HEAD: ${path} (${hash})`);
  }

  const bc = countHashes(base);
  const hc = countHashes(head);
  const contentDiffs: string[] = [];
  for (const h of new Set([...bc.keys(), ...hc.keys()])) {
    const nb = bc.get(h) ?? 0;
    const nh = hc.get(h) ?? 0;
    if (nb !== nh) contentDiffs.push(`content ${h}: BASE x${nb}, HEAD x${nh}`);
  }

  return {
    identical: pathDiffs.length === 0,
    sameContentSets: contentDiffs.length === 0,
    pathDiffs,
    contentDiffs,
  };
}
