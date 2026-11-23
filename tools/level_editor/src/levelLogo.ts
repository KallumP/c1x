// a level's logo on mod.io: the editor's view as it is, or an image the player
// chose, cropped to 16:9 (mod.io wants a logo that shape, at least 512x288)
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

// what's drawn in source (width by height) as a logo: a png, in base64
function logoOf(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): string {
  const logo = document.createElement("canvas");
  logo.width = LOGO_WIDTH;
  logo.height = LOGO_HEIGHT;
  const { x, y, width, height } = logoCrop(sourceWidth, sourceHeight);
  const context = logo.getContext("2d");
  context?.drawImage(source, x, y, width, height, 0, 0, LOGO_WIDTH, LOGO_HEIGHT);
  return logo.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

// the view drawn in canvas as a logo (the canvas has to keep what it drew,
// with three's preserveDrawingBuffer)
export const viewLogo = (canvas: HTMLCanvasElement) =>
  logoOf(canvas, canvas.width, canvas.height);

// an image file the player chose as a logo, or why it can't be one
export async function imageLogo(file: File): Promise<string> {
  try {
    const image = await createImageBitmap(file);
    return logoOf(image, image.width, image.height);
  } catch {
    throw new Error(`${file.name} isn't an image the browser can read.`);
  }
}
