import { describe, expect, test } from "vitest";
import { messageStrip } from "../../src/messageStrip";

const FAILED = { text: "Build failed: no floor", detail: "its output", failed: true };

describe("messageStrip", () => {
  test("shows the level's error", () => {
    const strip = messageStrip("couldn't save", null, []);
    expect(strip).toEqual({ kind: "error", lines: [{ text: "couldn't save" }] });
  });

  test("shows a failed build, its output on hover", () => {
    const strip = messageStrip(null, FAILED, []);
    const lines = [{ text: FAILED.text, detail: FAILED.detail }];
    expect(strip).toEqual({ kind: "error", lines });
  });

  test("shows the level's error and a failed build together, the error first", () => {
    const strip = messageStrip("couldn't save", FAILED, []);
    expect(strip?.lines.map((line) => line.text)).toEqual(["couldn't save", FAILED.text]);
  });

  test("an error hides the build's warnings", () => {
    expect(messageStrip("couldn't save", null, ["no spawn"])?.kind).toBe("error");
  });

  test("without an error, shows the build's warnings", () => {
    const strip = messageStrip(null, { text: "Built" }, ["no spawn", "no end"]);
    const lines = [{ text: "Warning: no spawn" }, { text: "Warning: no end" }];
    expect(strip).toEqual({ kind: "warning", lines });
  });

  test("a build that worked without warnings shows nothing", () => {
    expect(messageStrip(null, { text: "Built" }, [])).toBeNull();
  });
});
