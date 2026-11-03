// a level's sky: a top colour filling the screen down to split (of SKY_ROWS
// rows), and a bottom colour below it (GLRender in src/pc/gfx/gl.c). set in
// a level source's level.cfg as sky_top, sky_bottom and sky_split
export type Rgb = [number, number, number];

export interface Sky {
  top: Rgb;
  bottom: Rgb;
  split: number;
}

export const SKY_ROWS = 216;
export const DEFAULT_SKY: Sky = { top: [59, 62, 216], bottom: [54, 50, 0], split: 20 }; // n. sanity beach's

// "r, g, b" as a colour, or null if it isn't three whole numbers from 0 to 255
export function parseRgb(text: string): Rgb | null {
  const parts = text.split(",").map((part) => part.trim());
  if (parts.length !== 3 || !parts.every((part) => /^\d+$/.test(part) && Number(part) <= 255)) {
    return null;
  }
  return parts.map(Number) as Rgb;
}

export const formatRgb = ([red, green, blue]: Rgb) => `${red}, ${green}, ${blue}`;

export const isSkySplit = (split: number) => Number.isInteger(split) && split >= 0 && split <= SKY_ROWS;

export const isSameSky = (first: Sky, second: Sky) =>
  formatRgb(first.top) === formatRgb(second.top) && formatRgb(first.bottom) === formatRgb(second.bottom) && first.split === second.split;
