// an image as a texture page tile (tile() in tools/tpage.py, which used
// pillow): TILE x TILE pixels of at most COLOURS colours. a smaller image is
// scaled up without blurring, a bigger one scaled down smoothly (lanczos);
// more than COLOURS colours are reduced to COLOURS (median cut)
import type { RgbImage } from "./images";
import { colour5551, COLOURS, TILE, type Rgb, type Tile } from "./tpage";

// scaling

function resizeNearest(image: RgbImage, width: number, height: number): RgbImage {
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.floor(((y + 0.5) * image.height) / height);
    for (let x = 0; x < width; x++) {
      const sourceX = Math.floor(((x + 0.5) * image.width) / width);
      const source = (sourceY * image.width + sourceX) * 3;
      rgb.set(image.rgb.subarray(source, source + 3), (y * width + x) * 3);
    }
  }
  return { width, height, rgb };
}

const LANCZOS_LOBES = 3;

const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
const lanczos = (x: number) => (Math.abs(x) < LANCZOS_LOBES ? sinc(x) * sinc(x / LANCZOS_LOBES) : 0);

// the source pixels each output pixel along a side is made of, from start, and how much of each
interface Taps {
  start: number;
  weights: number[];
}

function lanczosTaps(sourceSize: number, outputSize: number): Taps[] {
  const scale = sourceSize / outputSize;
  const filterScale = Math.max(scale, 1); // widened when shrinking, so every source pixel counts
  const support = LANCZOS_LOBES * filterScale;
  return Array.from({ length: outputSize }, (_, output) => {
    const centre = (output + 0.5) * scale;
    const start = Math.max(0, Math.floor(centre - support));
    const end = Math.min(sourceSize, Math.ceil(centre + support));
    const weights = [];
    for (let source = start; source < end; source++) {
      weights.push(lanczos((source + 0.5 - centre) / filterScale));
    }
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return { start, weights: weights.map((weight) => weight / total) };
  });
}

const toByte = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

// one channel of a pixel filtered along a side: the taps' source pixels, from
// (x, y) on along x (isAcross) or y, weighted
function filteredChannel(image: RgbImage, x: number, y: number, isAcross: boolean, taps: Taps, channel: number): number {
  let value = 0;
  taps.weights.forEach((weight, tap) => {
    const sourceX = isAcross ? taps.start + tap : x;
    const sourceY = isAcross ? y : taps.start + tap;
    value += weight * image.rgb[(sourceY * image.width + sourceX) * 3 + channel];
  });
  return toByte(value);
}

// image scaled along one side: x (across) or y (down)
function resizeAlong(image: RgbImage, axis: "x" | "y", outputSize: number): RgbImage {
  const isAcross = axis === "x";
  const width = isAcross ? outputSize : image.width;
  const height = isAcross ? image.height : outputSize;
  const taps = lanczosTaps(isAcross ? image.width : image.height, outputSize);
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelTaps = taps[isAcross ? x : y];
      for (let channel = 0; channel < 3; channel++) {
        rgb[(y * width + x) * 3 + channel] = filteredChannel(image, x, y, isAcross, pixelTaps, channel);
      }
    }
  }
  return { width, height, rgb };
}

function resizeLanczos(image: RgbImage, width: number, height: number): RgbImage {
  return resizeAlong(resizeAlong(image, "x", width), "y", height);
}

function resizeToTile(image: RgbImage): RgbImage {
  const isSmall = image.width <= TILE && image.height <= TILE;
  return isSmall ? resizeNearest(image, TILE, TILE) : resizeLanczos(image, TILE, TILE);
}

// colours

const packColour = ([red, green, blue]: Rgb) => (red << 16) | (green << 8) | blue;
const unpackColour = (packed: number): Rgb => [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];

function colourAt(image: RgbImage, pixel: number): Rgb {
  return [image.rgb[pixel * 3], image.rgb[pixel * 3 + 1], image.rgb[pixel * 3 + 2]];
}

// each colour in the image (packed) and how many pixels have it, in the order they first appear
function countColours(image: RgbImage): Map<number, number> {
  const counts = new Map<number, number>();
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    const packed = packColour(colourAt(image, pixel));
    counts.set(packed, (counts.get(packed) ?? 0) + 1);
  }
  return counts;
}

interface ColourCount {
  colour: Rgb;
  count: number;
}

// the channel (0 red, 1 green, 2 blue) a box's colours spread furthest along, and how far
function widestChannel(box: ColourCount[]): { channel: number; range: number } {
  let widest = { channel: 0, range: -1 };
  for (let channel = 0; channel < 3; channel++) {
    const values = box.map(({ colour }) => colour[channel]);
    const range = Math.max(...values) - Math.min(...values);
    if (range > widest.range) {
      widest = { channel, range };
    }
  }
  return widest;
}

// a box split in two along its widest channel, at the colour half its pixels are below
function splitAtMedian(box: ColourCount[]): [ColourCount[], ColourCount[]] {
  const { channel } = widestChannel(box);
  const sorted = [...box].sort((first, second) => first.colour[channel] - second.colour[channel]);
  const half = sorted.reduce((sum, { count }) => sum + count, 0) / 2;
  let below = 0;
  let splitAt = 1;
  while (splitAt < sorted.length - 1 && below + sorted[splitAt - 1].count < half) {
    below += sorted[splitAt - 1].count;
    splitAt++;
  }
  return [sorted.slice(0, splitAt), sorted.slice(splitAt)];
}

// colours grouped into at most boxCount boxes, splitting the widest box each time
function medianCut(colours: ColourCount[], boxCount: number): ColourCount[][] {
  const boxes = [colours];
  while (boxes.length < boxCount) {
    const splittable = boxes.filter((box) => box.length > 1);
    if (splittable.length === 0) {
      break;
    }
    const widest = splittable.reduce((best, box) => (widestChannel(box).range > widestChannel(best).range ? box : best));
    boxes.splice(boxes.indexOf(widest), 1, ...splitAtMedian(widest));
  }
  return boxes;
}

function averageColour(box: ColourCount[]): Rgb {
  const pixels = box.reduce((sum, { count }) => sum + count, 0);
  const channelAverage = (channel: number) =>
    Math.round(box.reduce((sum, { colour, count }) => sum + colour[channel] * count, 0) / pixels);
  return [channelAverage(0), channelAverage(1), channelAverage(2)];
}

// the image with its colours reduced to at most maxColours, each the average of its box
function reduceColours(image: RgbImage, counts: Map<number, number>, maxColours: number): RgbImage {
  const colours = [...counts].map(([packed, count]) => ({ colour: unpackColour(packed), count }));
  const replacement = new Map<number, Rgb>();
  for (const box of medianCut(colours, maxColours)) {
    const average = averageColour(box);
    box.forEach(({ colour }) => replacement.set(packColour(colour), average));
  }
  const rgb = new Uint8Array(image.rgb.length);
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    rgb.set(replacement.get(packColour(colourAt(image, pixel)))!, pixel * 3);
  }
  return { ...image, rgb };
}

// the image as palette indices, its palette in the order colours first appear
function indexColours(image: RgbImage): Tile {
  const indexOf = new Map<number, number>();
  const pixels = [];
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    const packed = packColour(colourAt(image, pixel));
    if (!indexOf.has(packed)) {
      indexOf.set(packed, indexOf.size);
    }
    pixels.push(indexOf.get(packed)!);
  }
  const palette = [...indexOf.keys()].map((packed) => colour5551(unpackColour(packed)));
  return { pixels, palette: palette.concat(Array(COLOURS - palette.length).fill(0)) };
}

export function tileFromImage(image: RgbImage): Tile {
  const resized = resizeToTile(image);
  const counts = countColours(resized);
  const reduced = counts.size > COLOURS ? reduceColours(resized, counts, COLOURS) : resized;
  return indexColours(reduced);
}
