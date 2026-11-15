// a 5 by 7 pixel font, for the title on a custom level's loading screen (loadingImage.ts):
// capital letters, numbers and the punctuation a title can have (src/levelTitle.ts)

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
const GLYPH_GAP = 1; // the blank column between one character and the next

// which pixels of a width x height image are ink, row by row
export interface Mask {
  width: number;
  height: number;
  ink: Uint8Array; // 1 for ink, 0 for none
}

// each character's 7 rows of 5 pixels, # for ink
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
};

function glyphOf(character: string): string[] {
  const glyph = GLYPHS[character.toUpperCase()];
  if (!glyph) {
    throw new Error(`the loading screen's font has no ${character}`);
  }
  return glyph;
}

// how many pixels wide text is, drawn at scale
export function textWidth(text: string, scale: number): number {
  const characters = [...text].length;
  return Math.max(0, characters * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP) * scale;
}

// inks one glyph pixel as a scale x scale square of the mask
function inkSquare(mask: Mask, left: number, top: number, scale: number): void {
  for (let y = top; y < top + scale; y++) {
    mask.ink.fill(1, y * mask.width + left, y * mask.width + left + scale);
  }
}

function inkGlyph(mask: Mask, glyph: string[], left: number, scale: number): void {
  glyph.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel === "#") {
        inkSquare(mask, left + x * scale, y * scale, scale);
      }
    });
  });
}

// text in the font, each pixel a scale x scale square (small letters drawn as capitals)
export function textMask(text: string, scale: number): Mask {
  const glyphs = [...text].map(glyphOf);
  const width = textWidth(text, scale);
  const height = GLYPH_HEIGHT * scale;
  const mask: Mask = { width, height, ink: new Uint8Array(width * height) };
  glyphs.forEach((glyph, index) => inkGlyph(mask, glyph, index * (GLYPH_WIDTH + GLYPH_GAP) * scale, scale));
  return mask;
}
