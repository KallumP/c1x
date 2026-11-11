// making build/build-level.exe: the level build bundled into one script (npm
// run bundle-builder) and put in a copy of node, as a single executable
// application, so players can build levels from the launcher without node
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"; // node's, telling it it has a script in it
const SEA_RESOURCE = "NODE_SEA_BLOB";

export interface BuilderExeFiles {
  bundle: string; // the level build, bundled
  config: string; // node's single executable application config
  blob: string;   // the bundle as node prepares it to go in the exe
  exe: string;
}

export function builderExeFiles(repo: string, platform: NodeJS.Platform): BuilderExeFiles {
  const work = join(repo, "build", "build-level");
  let exe = join(repo, "build", "build-level");
  if (platform === "win32") {
    exe += ".exe";
  }
  return {
    bundle: join(work, "build-level.cjs"),
    config: join(work, "sea-config.json"),
    blob: join(work, "build-level.blob"),
    exe,
  };
}

// the code cache is left out: it ties the exe to the exact node it was made with
export function seaConfig(files: BuilderExeFiles) {
  return { main: files.bundle, output: files.blob, disableExperimentalSEAWarning: true, useCodeCache: false };
}

function prepareBlob(files: BuilderExeFiles): void {
  writeFileSync(files.config, JSON.stringify(seaConfig(files), null, 2));
  execFileSync(process.execPath, ["--experimental-sea-config", files.config], { stdio: "inherit" });
}

// postject puts the blob in the copy of node
function injectBlob(files: BuilderExeFiles): void {
  const postject = createRequire(import.meta.url).resolve("postject/dist/cli.js");
  const args = [postject, files.exe, SEA_RESOURCE, files.blob, "--sentinel-fuse", SEA_FUSE];
  if (process.platform === "darwin") {
    args.push("--macho-segment-name", "NODE_SEA");
  }
  execFileSync(process.execPath, args, { stdio: "inherit" });
}

// makes the exe from the bundle, which must already be built
export function makeBuilderExe(repo: string): string {
  const files = builderExeFiles(repo, process.platform);
  mkdirSync(dirname(files.config), { recursive: true });
  prepareBlob(files);
  rmSync(files.exe, { force: true });
  copyFileSync(process.execPath, files.exe);
  injectBlob(files);
  return files.exe;
}
