// a release of c1x, unzipped beside the folder the player has now: its zip holds
// one folder, c1x-<version>, as the release script makes it
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Answer } from "./answer";
import { isPlainName, tryUnzip, zippedFiles } from "./zipEntries";

// a release's folder, and its zip's name without .zip, as the release script makes it
export const releaseName = (version: string) => `c1x-${version}`;

// whether every file is inside top's folder, by names that stay where they're put
const isIn = (top: string, parts: string[]) =>
  parts.length > 1 && parts[0] === top && parts.every(isPlainName);
const allIn = (top: string, files: [string[], Uint8Array][]) =>
  files.every(([parts]) => isIn(top, parts));

function writeFiles(parent: string, files: [string[], Uint8Array][]): void {
  for (const [parts, data] of files) {
    const path = join(parent, ...parts);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
  }
}

// unzips version's zip into parent as its own folder, leaving one already there
// alone; the new folder's path
export function unzipRelease(
  zip: Uint8Array,
  parent: string,
  version: string,
): Answer<{ folder: string }> {
  const unzipped = tryUnzip(zip);
  if (!unzipped) {
    return { problem: "The download isn't a zip." };
  }
  const top = releaseName(version);
  const files = zippedFiles(unzipped);
  if (files.length === 0 || !allIn(top, files)) {
    return { problem: `The download isn't c1x ${version}.` };
  }
  const folder = join(parent, top);
  if (existsSync(folder)) {
    return { problem: `${folder} is already there: delete or rename it first.` };
  }
  writeFiles(parent, files);
  return { folder };
}
