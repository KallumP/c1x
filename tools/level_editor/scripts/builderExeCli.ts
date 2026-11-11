// npm run builder-exe: bundles the level build and makes build/build-level.exe
// from it (see builderExe.ts); make runs this
import { fileURLToPath } from "node:url";
import { makeBuilderExe } from "./builderExe";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

try {
  console.log(`made ${makeBuilderExe(REPO)}`);
} catch (error) {
  console.log(`error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
