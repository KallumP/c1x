import { describe, expect, test } from "vitest";
import { GLYPH_HEIGHT, GLYPH_WIDTH, textMask, textWidth } from "../../builder/pixelFont";
import { TITLE_PUNCTUATION } from "../../src/levelTitle";

// the mask's rows as text, # for ink
function maskRows(text: string, scale: number): string[] {
  const mask = textMask(text, scale);
  return Array.from({ length: mask.height }, (_, y) =>
    Array.from(mask.ink.subarray(y * mask.width, (y + 1) * mask.width), (inked) => (inked ? "#" : ".")).join(""));
}

describe("the pixel font", () => {
  test("draws every character a title can have", () => {
    const characters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", ...TITLE_PUNCTUATION];
    characters.forEach((character) => expect(() => textMask(character, 1)).not.toThrow());
  });

  test("draws a letter in its 5 by 7 cell", () => {
    expect(maskRows("T", 1)).toEqual(["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."]);
  });

  test("draws small letters as capitals", () => {
    expect(maskRows("tide", 1)).toEqual(maskRows("TIDE", 1));
  });

  test("puts a column's gap between letters, and none after the last", () => {
    expect(textWidth("AB", 1)).toBe(2 * GLYPH_WIDTH + 1);
    expect(textMask("AB", 1).width).toBe(2 * GLYPH_WIDTH + 1);
    expect(maskRows("-", 1)[3]).toBe("#####");
  });

  test("scales each pixel to a square of scale pixels", () => {
    const mask = textMask("I", 3);
    expect([mask.width, mask.height]).toEqual([3 * GLYPH_WIDTH, 3 * GLYPH_HEIGHT]);
    expect(maskRows("I", 3)[0]).toBe("...#########...");
  });

  test("refuses a character it hasn't got", () => {
    expect(() => textMask("é", 1)).toThrow(/é/);
  });
});
