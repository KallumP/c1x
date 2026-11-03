import { describe, expect, test } from "vitest";
import { DEFAULT_SKY, formatRgb, hexToRgb, isSameSky, isSkySplit, parseRgb, rgbToHex } from "../../src/sky";

describe("a level's sky", () => {
  test("reads a colour as red, green, blue", () => {
    expect(parseRgb("59, 62, 216")).toEqual([59, 62, 216]);
    expect(parseRgb("0,0,0")).toEqual([0, 0, 0]);
  });

  test("a colour has three whole numbers from 0 to 255", () => {
    expect(parseRgb("1, 2")).toBeNull();
    expect(parseRgb("256, 0, 0")).toBeNull();
    expect(parseRgb("1.5, 0, 0")).toBeNull();
  });

  test("writes a colour back the same way", () => {
    expect(formatRgb([59, 62, 216])).toBe("59, 62, 216");
  });

  test("splits on the screen's 216 rows", () => {
    expect([0, 20, 216].every(isSkySplit)).toBe(true);
    expect([-1, 217, 1.5].some(isSkySplit)).toBe(false);
  });

  test("two skies are the same when their colours and split are", () => {
    expect(isSameSky(DEFAULT_SKY, { top: [59, 62, 216], bottom: [54, 50, 0], split: 20 })).toBe(true);
    expect(isSameSky(DEFAULT_SKY, { ...DEFAULT_SKY, top: [59, 62, 215] })).toBe(false);
    expect(isSameSky(DEFAULT_SKY, { ...DEFAULT_SKY, split: 21 })).toBe(false);
  });

  test("a colour as a colour picker's #rrggbb, and back", () => {
    expect(rgbToHex([59, 62, 216])).toBe("#3b3ed8");
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
    expect(hexToRgb("#3b3ed8")).toEqual([59, 62, 216]);
    expect(hexToRgb("#FFFFFF")).toEqual([255, 255, 255]);
  });
});
