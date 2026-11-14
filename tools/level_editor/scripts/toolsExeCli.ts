// npm run tools-exe: bundles the tools and makes build/c1x_tools.exe from them
// (see toolsExe.ts); make runs this
import { fileURLToPath } from "node:url";
import { makeToolsExe } from "./toolsExe";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

try {
  console.log(`made ${makeToolsExe(REPO)}`);
} catch (error) {
  console.log(`error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
