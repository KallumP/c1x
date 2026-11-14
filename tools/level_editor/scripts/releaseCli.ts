// npm run release -- <version>: makes the player release zip, build/release/c1x-<version>.zip
// (see doc/releasing.md); make the game, the launcher and build-level.exe first
import { fileURLToPath } from "node:url";
import { makeRelease } from "./release";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

try {
  console.log(`made ${makeRelease(REPO, process.argv[2] ?? "")}`);
} catch (error) {
  console.log(`error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
