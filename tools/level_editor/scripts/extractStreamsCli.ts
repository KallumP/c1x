// npm run extract-streams -- <disc image> [output dir]: copies the game's asset
// files from a disc image of your own copy into streams (see doc/running.md)
import { fileURLToPath } from "node:url";
import { extractStreams } from "./extractStreams";

const STREAMS_DIR = fileURLToPath(new URL("../../../streams", import.meta.url));

const USAGE = `usage: npm run extract-streams -- <disc image> [output dir]

  disc image  a .bin (raw 2352 byte sectors) or .iso of your own copy of Crash Bandicoot
  output dir  where to put its .nsd and .nsf files (the project's streams folder)`;

const [image, outDir = STREAMS_DIR] = process.argv.slice(2);
if (!image) {
  console.log(USAGE);
  process.exitCode = 1;
} else {
  try {
    const count = extractStreams(image, outDir);
    console.log(`extracted ${count} files to ${outDir}`);
  } catch (error) {
    console.log(`error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
