// Generate a GitHub release body from the single source of truth at
// `changelog/index.js`. Usage:
//
//   bun scripts/release-notes.mjs            # latest release
//   bun scripts/release-notes.mjs v4.1.0     # a specific version
//
// Pipe straight into gh:
//   bun scripts/release-notes.mjs v4.1.0 | gh release create v4.1.0 --title "v4.1.0" --notes-file -
import { releases, latest } from "../changelog/index.js";

const target = process.argv[2] ?? latest.version;
const release = releases.find((r) => r.version === target) ?? latest;

const out = [
  `## What's new in ${release.version}`,
  "",
  release.blurb,
  "",
];

for (const { group, items } of release.highlights) {
  out.push(`### ${group}`, "");
  for (const item of items) out.push(`- ${item}`);
  out.push("");
}

if (release.diff) {
  const range = release.diff.match(/compare\/(.+)$/)?.[1] ?? release.diff;
  out.push(`**Full diff:** [\`${range}\`](${release.diff})`);
}

process.stdout.write(out.join("\n") + "\n");
