// c1x_tools and its commands (see tools.ts); bundled into
// build/c1x_tools.exe by npm run tools-exe, which make runs
import { isSea } from "node:sea";
import { fileURLToPath } from "node:url";
import { repoOfExe } from "../builder/repoFolders";
import { runTools, toolsHandlers } from "./tools";

// the project's folder: above build/ for the exe, else three up from this file
function repoFolder(): string {
  if (isSea()) {
    return repoOfExe(process.execPath);
  }
  return fileURLToPath(new URL("../../..", import.meta.url));
}

runTools(process.argv.slice(2), toolsHandlers(repoFolder())).then((exitCode) => {
  process.exitCode = exitCode;
});
