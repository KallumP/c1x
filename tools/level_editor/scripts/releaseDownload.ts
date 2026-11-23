// downloading a release of c1x for the launcher's new version button: its zip
// from GitHub, unzipped beside the player's c1x folder with their things copied in

import { dirname, resolve } from "node:path";
import { errorMessage } from "../src/errorMessage";
import { isProblem, type Answer } from "./answer";
import { downloadFile } from "./download";
import { copyPlayersThings } from "./playersThings";
import { isReleaseVersion, releaseName } from "./releaseName";
import { unzipRelease } from "./releaseUnzip";

const RELEASES_URL = "https://github.com/KallumP/c1x/releases";

// where GitHub keeps a release's zip: each release is tagged with a v before its version
export const releaseZipUrl = (version: string) =>
  `${RELEASES_URL}/download/v${version}/${releaseName(version)}.zip`;

// what's said before the new version's folder, which the launcher looks for.
// release_download.c has the same text, and a test checks the two are the same
export const RELEASE_INSTALLED_PREFIX = "installed release: ";

function installRelease(
  playersFolder: string,
  zip: Uint8Array,
  version: string,
): Answer<{ folder: string }> {
  try {
    const unzipped = unzipRelease(dirname(playersFolder), zip, version);
    if (!isProblem(unzipped)) {
      copyPlayersThings(playersFolder, unzipped.folder);
    }
    return unzipped;
  } catch (error) {
    return { problem: errorMessage(error) };
  }
}

// c1x_tools download-release <version>: downloads that release, unzipped beside
// repo (the player's c1x folder) with their things copied in, saying where (the
// line the launcher reads), or why it couldn't; returns the exit code, 1 if it couldn't
export async function downloadReleaseCommand(
  repo: string,
  version: string,
  say: (line: string) => void,
  download: typeof downloadFile = downloadFile,
): Promise<number> {
  if (!isReleaseVersion(version)) {
    say(`"${version}" isn't a version: it has to be two numbers, like 1.5`);
    return 1;
  }
  const zip = await download(releaseZipUrl(version));
  if (isProblem(zip)) {
    say(`couldn't download c1x ${version}: ${zip.problem}`);
    return 1;
  }
  const installed = installRelease(resolve(repo), zip, version);
  if (isProblem(installed)) {
    say(`couldn't install c1x ${version}: ${installed.problem}`);
    return 1;
  }
  say(`${RELEASE_INSTALLED_PREFIX}${installed.folder}`);
  return 0;
}
