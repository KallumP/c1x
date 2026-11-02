import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setBootLevel, writeBootLevel } from "../../server/settings";

describe("setBootLevel", () => {
  test("replaces the boot_level line", () => {
    expect(setBootLevel("speed_display = on\nboot_level = tide_ruins\n", "mossy_creek"))
      .toBe("speed_display = on\nboot_level = mossy_creek\n");
  });

  test("leaves commented ones alone", () => {
    expect(setBootLevel("boot_level = tide_ruins\n# boot_level = mossy_creek\n", "facing_castle"))
      .toBe("boot_level = facing_castle\n# boot_level = mossy_creek\n");
  });

  test("adds one at the end without one", () => {
    expect(setBootLevel("speed_display = on\n# boot_level = tide_ruins\n", "mossy_creek"))
      .toBe("speed_display = on\n# boot_level = tide_ruins\nboot_level = mossy_creek\n");
  });

  test("adds one after a last line with no newline", () => {
    expect(setBootLevel("speed_display = on", "mossy_creek")).toBe("speed_display = on\nboot_level = mossy_creek\n");
  });

  test("keeps crlf line endings", () => {
    expect(setBootLevel("speed_display = on\r\nboot_level = a\r\n", "b")).toBe("speed_display = on\r\nboot_level = b\r\n");
    expect(setBootLevel("speed_display = on\r\n", "b")).toBe("speed_display = on\r\nboot_level = b\r\n");
  });
});

describe("writeBootLevel", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "settings-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test("sets it in an existing settings.cfg", () => {
    writeFileSync(join(dir, "settings.cfg"), "speed_display = on\nboot_level = a\n");
    writeBootLevel(join(dir, "settings.cfg"), "b");
    expect(readFileSync(join(dir, "settings.cfg"), "utf8")).toBe("speed_display = on\nboot_level = b\n");
  });

  test("makes settings.cfg without one", () => {
    writeBootLevel(join(dir, "settings.cfg"), "b");
    expect(readFileSync(join(dir, "settings.cfg"), "utf8")).toBe("boot_level = b\n");
  });
});
