// the game's own loading screens: every one is the same "LOADING" sign with its level's name under
// it, so they're what a custom level's loading screen is made from (loadingSign.ts)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RgbImage } from "./images";
import { loadingImageOf } from "./loadingImage";
import { readNsd } from "./levelFiles";

export interface LoadingScreen {
  name: string; // the name under the sign, in capitals
  image: RgbImage;
}

// the game's files with a loading screen, and the name each shows
export const ORIGINAL_LOADING_SCREENS = [
  { file: "s0000003", name: "CORTEX POWER" },
  { file: "s0000005", name: "GENERATOR ROOM" },
  { file: "s0000006", name: "HEAVY MACHINERY" },
  { file: "s0000007", name: "TOXIC WASTE" },
  { file: "s0000008", name: "PINSTRIPE" },
  { file: "s0000009", name: "N. SANITY BEACH" },
  { file: "s000000a", name: "PAPU PAPU" },
  { file: "s000000c", name: "JUNGLE ROLLERS" },
  { file: "s000000e", name: "BOULDERS" },
  { file: "s000000f", name: "UPSTREAM" },
  { file: "s0000011", name: "HOG WILD" },
  { file: "s0000012", name: "THE GREAT GATE" },
  { file: "s0000013", name: "BOULDER DASH" },
  { file: "s0000014", name: "ROAD TO NOWHERE" },
  { file: "s0000015", name: "ROLLING STONES" },
  { file: "s0000016", name: "THE HIGH ROAD" },
  { file: "s0000017", name: "RIPPER ROO" },
  { file: "s0000018", name: "UP THE CREEK" },
  { file: "s0000019", name: "MAP" },
  { file: "s000001a", name: "NATIVE FORTRESS" },
  { file: "s000001b", name: "NITRUS BRIO" },
  { file: "s000001c", name: "TEMPLE RUINS" },
  { file: "s000001d", name: "JAWS OF DARKNESS" },
  { file: "s000001e", name: "WHOLE HOG" },
  { file: "s000001f", name: "DR. NEO CORTEX" },
  { file: "s0000020", name: "THE LOST CITY" },
  { file: "s0000021", name: "KOALA KONG" },
  { file: "s0000022", name: "STORMY ASCENT" },
  { file: "s0000023", name: "SUNSET VISTA" },
  { file: "s0000024", name: "BONUS ROUND" },
  { file: "s0000025", name: "BONUS ROUND" },
  { file: "s0000028", name: "LIGHTS OUT" },
  { file: "s0000029", name: "THE LAB" },
  { file: "s000002a", name: "FUMBLING IN THE DARK" },
  { file: "s000002c", name: "THE GREAT HALL" },
  { file: "s000002e", name: "SLIPPERY CLIMB" },
  { file: "s0000033", name: "BONUS ROUND" },
  { file: "s0000034", name: "BONUS ROUND" },
  { file: "s0000037", name: "CASTLE MACHINERY" },
];

function readLoadingScreen(streamsDir: string, file: string, name: string): LoadingScreen {
  const path = join(streamsDir, `${file}.nsd`);
  if (!existsSync(path)) {
    throw new Error(`the loading screen is made from the game's own, but ${file}.nsd isn't in ${streamsDir} (see doc/running.md)`);
  }
  return { name, image: loadingImageOf(readNsd(readFileSync(path))) };
}

// every one of the game's loading screens, from the .nsd files in streamsDir
export const readLoadingScreens = (streamsDir: string): LoadingScreen[] =>
  ORIGINAL_LOADING_SCREENS.map(({ file, name }) => readLoadingScreen(streamsDir, file, name));
