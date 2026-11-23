// reading a zip's files, for a level from mod.io and a release from GitHub
import { unzipSync, type Unzipped } from "fflate";

const MAC_FOLDER = "__MACOSX/"; // what a mac adds to a zip it makes
// a file name that stays in its folder on any system: no slashes either way, or a
// drive's colon
const PLAIN_NAME = /^[^\\/:*?"<>|]+$/;

export function tryUnzip(zip: Uint8Array): Unzipped | null {
  try {
    return unzipSync(zip);
  } catch {
    return null;
  }
}

// the zip's files, by their paths split at each /, without folders or a mac's extras
export function zippedFiles(unzipped: Unzipped): [string[], Uint8Array][] {
  return Object.entries(unzipped)
    .filter(([path]) => !path.endsWith("/") && !path.startsWith(MAC_FOLDER))
    .map(([path, data]) => [path.split("/"), data]);
}

// whether name, one part of a path, stays where it's put: not . or .., and plain
export const isPlainName = (name: string) =>
  PLAIN_NAME.test(name) && name !== "." && name !== "..";
