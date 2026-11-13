// a number drawn on a texture, for labels in the viewport (a switch's number,
// or the switch an outline belongs to): white on a dark round badge, one texture
// a number and colour, made once
import { CanvasTexture, SRGBColorSpace } from "three";

const TEXTURE_SIZE = 128;
const BADGE_COLOUR = "rgba(20, 20, 20, 0.85)";
const textures = new Map<string, CanvasTexture>();

function drawBadge(context: CanvasRenderingContext2D, ring: string): void {
  const middle = TEXTURE_SIZE / 2;
  context.beginPath();
  context.arc(middle, middle, middle - 6, 0, Math.PI * 2);
  context.fillStyle = BADGE_COLOUR;
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = ring;
  context.stroke();
}

function drawNumber(context: CanvasRenderingContext2D, number: number): void {
  context.fillStyle = "#ffffff";
  context.font = `bold ${TEXTURE_SIZE * 0.55}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(number), TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 4);
}

function makeNumberTexture(number: number, ring: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext("2d")!;
  drawBadge(context, ring);
  drawNumber(context, number);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// the texture of number on a badge ringed in ring (a css colour)
export function numberTexture(number: number, ring: string): CanvasTexture {
  const key = `${number} ${ring}`;
  if (!textures.has(key)) {
    textures.set(key, makeNumberTexture(number, ring));
  }
  return textures.get(key)!;
}
