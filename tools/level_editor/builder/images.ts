// reading a material's image (PNG or JPEG) as its RGB pixels, for its texture
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

export interface RgbImage {
  width: number;
  height: number;
  rgb: Uint8Array; // 3 bytes a pixel, row by row
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const isPng = (data: Buffer) => data.subarray(0, 8).equals(PNG_SIGNATURE);
const isJpeg = (data: Buffer) => data[0] === 0xff && data[1] === 0xd8;

function dropAlpha(rgba: Uint8Array, pixelCount: number): Uint8Array {
  const rgb = new Uint8Array(pixelCount * 3);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    rgb.set(rgba.subarray(pixel * 4, pixel * 4 + 3), pixel * 3);
  }
  return rgb;
}

function decodePng(data: Buffer): RgbImage {
  const { width, height, data: rgba } = PNG.sync.read(data);
  return { width, height, rgb: dropAlpha(rgba, width * height) };
}

function decodeJpeg(data: Buffer): RgbImage {
  const { width, height, data: rgb } = jpeg.decode(data, { useTArray: true, formatAsRGBA: false });
  return { width, height, rgb };
}

// the image at path; alpha is ignored. anything but a PNG or JPEG is an error
export function readImage(path: string): RgbImage {
  const data = readFileSync(path);
  if (isPng(data)) {
    return decodePng(data);
  }
  if (isJpeg(data)) {
    return decodeJpeg(data);
  }
  throw new Error(`${basename(path)} isn't a PNG or JPEG, so it can't be a texture`);
}
