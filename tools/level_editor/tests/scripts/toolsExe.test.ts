import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { seaConfig, toolsExeFiles } from "../../scripts/toolsExe";

describe("making c1x_tools.exe", () => {
  test("its files are in the repo's build folder, the bundle's in a folder of its own", () => {
    const build = join("c1x", "build");
    expect(toolsExeFiles("c1x", "win32")).toEqual({
      bundle: join(build, "tools_bundle", "c1x_tools.cjs"),
      config: join(build, "tools_bundle", "sea-config.json"),
      blob: join(build, "tools_bundle", "c1x_tools.blob"),
      exe: join(build, "c1x_tools.exe"),
    });
  });

  test("is c1x_tools without .exe off windows", () => {
    expect(toolsExeFiles("c1x", "linux").exe).toBe(join("c1x", "build", "c1x_tools"));
  });

  test("runs the bundle, without node's experimental warning in its output", () => {
    const files = toolsExeFiles("c1x", "win32");
    expect(seaConfig(files)).toEqual({
      main: files.bundle,
      output: files.blob,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    });
  });
});
