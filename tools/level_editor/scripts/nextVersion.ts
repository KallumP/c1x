// the version the next release gets, from the releases' tags (v1.4 and so on,
// see doc/releasing.md): one more than the latest. release.bat suggests it
import { execFileSync } from "node:child_process";
import { isNewer, versionNumbers } from "./updateCheck";

const FIRST_VERSION = "1.0";

// every tag of the repository at repo, release tags among them (git pull
// brings those in with their commits)
export function repositoryTags(repo: string): string[] {
  return execFileSync("git", ["tag", "--list"], { cwd: repo, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
}

// whether tag is a release's: a version after a v, as the launcher's check compares them
function isReleaseTag(tag: string): boolean {
  return tag.startsWith("v") && versionNumbers(tag) !== undefined;
}

// the latest release's tag, or none without a release
function latestReleaseTag(tags: string[]): string | undefined {
  let latest: string | undefined;
  for (const tag of tags.filter(isReleaseTag)) {
    if (!latest || isNewer(latest, tag)) {
      latest = tag;
    }
  }
  return latest;
}

// the next release's version: the latest's with one more second number, or
// 1.0 for the first release
export function nextVersion(tags: string[]): string {
  const latest = versionNumbers(latestReleaseTag(tags) ?? "");
  if (!latest) {
    return FIRST_VERSION;
  }
  const [major, minor] = latest;
  return `${major}.${minor + 1}`;
}
