// npm run release -- <version>: makes the player release zip, release/c1x-<version>.zip
// (see doc/releasing.md); make the game, the tools and the launcher first, the
// launcher as that version (release.bat does all of it)
import { fileURLToPath } from "node:url";
import { makeRelease } from "./release";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

try {
  console.log(`made ${makeRelease(REPO, process.argv[2] ?? "")}`);
} catch (error) {
  console.log(`error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
