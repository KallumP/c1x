// downloading a release of c1x for the launcher's new version button: its zip
// from GitHub, saved into the player's Downloads folder for them to unzip

import { homedir } from "node:os";
import { join } from "node:path";

const RELEASES_URL = "https://github.com/KallumP/c1x/releases";

// a release's folder, and its zip's name without .zip, as the release script makes it
export const releaseName = (version: string) => `c1x-${version}`;

// where GitHub keeps a release's zip: each release is tagged with a v before its version
export const releaseZipUrl = (version: string) =>
  `${RELEASES_URL}/download/v${version}/${releaseName(version)}.zip`;

// the player's Downloads folder: the one in their home folder (Windows' own, and
// most Linux desktops'). home is a test's stand-in
export const downloadsFolder = (home: string = homedir()) => join(home, "Downloads");
