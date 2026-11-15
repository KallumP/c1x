import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { LOADING_IMAGE_HEIGHT, LOADING_IMAGE_WIDTH } from "../../builder/loadingImage";
import { ORIGINAL_LOADING_SCREENS, readLoadingScreens } from "../../builder/loadingScreens";

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const hasStreams = ORIGINAL_LOADING_SCREENS.every(({ file }) => existsSync(join(STREAMS, `${file}.nsd`)));

describe.skipIf(!hasStreams)("the game's own loading screens", () => {
  test("are read from the streams folder, each with the name it shows", () => {
    const screens = readLoadingScreens(STREAMS);
    expect(screens.map(({ name }) => name)).toEqual(ORIGINAL_LOADING_SCREENS.map(({ name }) => name));
    expect(screens.every(({ image }) => image.width === LOADING_IMAGE_WIDTH && image.height === LOADING_IMAGE_HEIGHT)).toBe(true);
  });

  test("missing from the streams folder stop the build, saying which", () => {
    const streams = mkdtempSync(join(tmpdir(), "streams-"));
    try {
      ORIGINAL_LOADING_SCREENS.slice(1).forEach(({ file }) => copyFileSync(join(STREAMS, `${file}.nsd`), join(streams, `${file}.nsd`)));
      expect(() => readLoadingScreens(streams)).toThrow(`${ORIGINAL_LOADING_SCREENS[0].file}.nsd isn't in ${streams}`);
    } finally {
      rmSync(streams, { recursive: true });
    }
  });
});
