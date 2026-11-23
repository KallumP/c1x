// c1x_tools download-level <id>: a level shared on mod.io, downloaded into
// level_src/ and built, for the launcher's Levels tab
import { unzipLevel } from "./levelUnzip";
import { downloadLevelZip, isProblem, fetchOnlineLevel, type Answer } from "./modio";

// mod.io's calls and the level build, or a test's stand-ins for them
export interface DownloadCalls {
  fetchOnlineLevel: typeof fetchOnlineLevel;
  downloadLevelZip: typeof downloadLevelZip;
  buildLevel: (name: string) => boolean; // whether it built
}

// the level mod modId is, unzipped into level_src/ (root): its name there and on mod.io
async function downloadedLevel(
  root: string,
  modId: number,
  calls: DownloadCalls,
): Promise<Answer<{ folder: string; name: string }>> {
  const level = await calls.fetchOnlineLevel(modId);
  if (isProblem(level)) {
    return level;
  }
  const zip = await calls.downloadLevelZip(level.fileUrl);
  if (isProblem(zip)) {
    return zip;
  }
  const unzipped = unzipLevel(root, zip, { modId, page: level.page });
  if (isProblem(unzipped)) {
    return unzipped;
  }
  return { folder: unzipped.name, name: level.name };
}

// downloads the level mod modId into level_src/ (root) and builds it, saying
// what it did or why it couldn't; returns the exit code, 1 if it didn't build
export async function downloadLevelCommand(
  root: string,
  modId: number,
  say: (line: string) => void,
  calls: DownloadCalls,
): Promise<number> {
  const downloaded = await downloadedLevel(root, modId, calls);
  if (isProblem(downloaded)) {
    say(`couldn't download level ${modId}: ${downloaded.problem}`);
    return 1;
  }
  say(`downloaded ${downloaded.name} into level_src/${downloaded.folder}`);
  if (!calls.buildLevel(downloaded.folder)) {
    return 1;
  }
  return 0;
}
