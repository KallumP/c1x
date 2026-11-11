import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { builderExeFiles, seaConfig } from "../../scripts/builderExe";

describe("making build-level.exe", () => {
  test("its files are in the repo's build folder", () => {
    const build = join("c1x", "build");
    expect(builderExeFiles("c1x", "win32")).toEqual({
      bundle: join(build, "build-level", "build-level.cjs"),
      config: join(build, "build-level", "sea-config.json"),
      blob: join(build, "build-level", "build-level.blob"),
      exe: join(build, "build-level.exe"),
    });
  });

  test("is build-level without .exe off windows", () => {
    expect(builderExeFiles("c1x", "linux").exe).toBe(join("c1x", "build", "build-level"));
  });

  test("runs the bundle, without node's experimental warning in its output", () => {
    const files = builderExeFiles("c1x", "win32");
    expect(seaConfig(files)).toEqual({
      main: files.bundle,
      output: files.blob,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    });
  });
});
