// a level's logo on mod.io: the editor's view, cropped to 16:9 (mod.io wants a
// logo that shape, at least 512x288)
export const LOGO_WIDTH = 1280;
export const LOGO_HEIGHT = 720;

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// the middle of a view as big as 16:9 fits in it, in whole pixels
export function logoCrop(viewWidth: number, viewHeight: number): Crop {
  const width = Math.min(viewWidth, Math.floor((viewHeight * LOGO_WIDTH) / LOGO_HEIGHT));
  const height = Math.min(viewHeight, Math.floor((viewWidth * LOGO_HEIGHT) / LOGO_WIDTH));
  const x = Math.floor((viewWidth - width) / 2);
  const y = Math.floor((viewHeight - height) / 2);
  return { x, y, width, height };
}

// the view drawn in canvas as a logo: a png, in base64 (the canvas has to keep
// what it drew, with three's preserveDrawingBuffer)
export function viewLogo(canvas: HTMLCanvasElement): string {
  const logo = document.createElement("canvas");
  logo.width = LOGO_WIDTH;
  logo.height = LOGO_HEIGHT;
  const { x, y, width, height } = logoCrop(canvas.width, canvas.height);
  const context = logo.getContext("2d");
  context?.drawImage(canvas, x, y, width, height, 0, 0, LOGO_WIDTH, LOGO_HEIGHT);
  return logo.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}
