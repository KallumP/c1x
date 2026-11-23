import { describe, expect, test } from "vitest";
import { join } from "node:path";
import { downloadsFolder, releaseName, releaseZipUrl } from "../../scripts/releaseDownload";

describe("a release's zip", () => {
  test("is named c1x and its version", () => {
    expect(releaseName("1.5")).toBe("c1x-1.5");
  });

  test("downloads from its release on GitHub, tagged with a v", () => {
    expect(releaseZipUrl("1.5")).toBe("https://github.com/KallumP/c1x/releases/download/v1.5/c1x-1.5.zip");
  });
});

describe("the player's Downloads folder", () => {
  test("is the Downloads folder in their home folder", () => {
    expect(downloadsFolder("C:/Users/me")).toBe(join("C:/Users/me", "Downloads"));
  });
});
