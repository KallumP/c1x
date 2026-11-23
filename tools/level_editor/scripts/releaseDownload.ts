// downloading a release of c1x for the launcher's new version button: its zip
// from GitHub, saved into the player's Downloads folder for them to unzip

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { errorMessage } from "../src/errorMessage";
import { downloadFile } from "./download";
import { isProblem } from "./modio";
import { versionNumbers } from "./updateCheck";

const RELEASES_URL = "https://github.com/KallumP/c1x/releases";

// a release's folder, and its zip's name without .zip, as the release script makes it
export const releaseName = (version: string) => `c1x-${version}`;

// where GitHub keeps a release's zip: each release is tagged with a v before its version
export const releaseZipUrl = (version: string) =>
  `${RELEASES_URL}/download/v${version}/${releaseName(version)}.zip`;

// the player's Downloads folder: the one in their home folder (Windows' own, and
// most Linux desktops'). home is a test's stand-in
export const downloadsFolder = (home: string = homedir()) => join(home, "Downloads");

// what's said before where the release was saved, which the launcher looks for.
// release_download.c has the same text, and a test checks the two are the same
export const RELEASE_SAVED_PREFIX = "saved release: ";

// the download and the folder it's saved in, or a test's stand-ins
export interface ReleaseDownload {
  downloadFile: typeof downloadFile;
  downloads: string;
}

// the real download, into the player's own Downloads folder
const PLAYERS_DOWNLOAD: ReleaseDownload = { downloadFile, downloads: downloadsFolder() };

// saves zip as version's in the downloads folder, making it if it isn't there; its path
function saveReleaseZip(downloads: string, version: string, zip: Uint8Array): string {
  const path = join(downloads, `${releaseName(version)}.zip`);
  mkdirSync(downloads, { recursive: true });
  writeFileSync(path, zip);
  return path;
}

// c1x_tools download-release <version>: downloads that release's zip into the
// player's Downloads folder, saying where (the line the launcher reads), or why
// it couldn't; returns the exit code, 1 if it couldn't
export async function downloadReleaseCommand(
  version: string,
  say: (line: string) => void,
  { downloadFile: download, downloads }: ReleaseDownload = PLAYERS_DOWNLOAD,
): Promise<number> {
  if (!versionNumbers(version)) {
    say(`"${version}" isn't a version: it has to be two numbers, like 1.5`);
    return 1;
  }
  const zip = await download(releaseZipUrl(version));
  if (isProblem(zip)) {
    say(`couldn't download c1x ${version}: ${zip.problem}`);
    return 1;
  }
  try {
    say(`${RELEASE_SAVED_PREFIX}${saveReleaseZip(downloads, version, zip)}`);
    return 0;
  } catch (error) {
    say(`couldn't save c1x ${version} in ${downloads}: ${errorMessage(error)}`);
    return 1;
  }
}
