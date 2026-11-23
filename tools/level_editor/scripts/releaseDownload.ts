// downloading a release of c1x for the launcher's new version button: its zip
// from GitHub, unzipped beside the player's c1x folder with their things copied in

import { dirname, resolve } from "node:path";
import { errorMessage } from "../src/errorMessage";
import { isProblem, type Answer } from "./answer";
import { downloadFile } from "./download";
import { copyPlayersThings } from "./playersThings";
import { releaseName, unzipRelease } from "./releaseUnzip";
import { versionNumbers } from "./updateCheck";

const RELEASES_URL = "https://github.com/KallumP/c1x/releases";

// where GitHub keeps a release's zip: each release is tagged with a v before its version
export const releaseZipUrl = (version: string) =>
  `${RELEASES_URL}/download/v${version}/${releaseName(version)}.zip`;

// what's said before the new version's folder, which the launcher looks for.
// release_download.c has the same text, and a test checks the two are the same
export const RELEASE_INSTALLED_PREFIX = "installed release: ";

// unzips zip beside the player's folder current, and copies their things into it
function installRelease(
  zip: Uint8Array,
  current: string,
  version: string,
): Answer<{ folder: string }> {
  try {
    const unzipped = unzipRelease(zip, dirname(current), version);
    if (!isProblem(unzipped)) {
      copyPlayersThings(current, unzipped.folder);
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
  version: string,
  repo: string,
  say: (line: string) => void,
  download: typeof downloadFile = downloadFile,
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
  const installed = installRelease(zip, resolve(repo), version);
  if (isProblem(installed)) {
    say(`couldn't install c1x ${version}: ${installed.problem}`);
    return 1;
  }
  say(`${RELEASE_INSTALLED_PREFIX}${installed.folder}`);
  return 0;
}
