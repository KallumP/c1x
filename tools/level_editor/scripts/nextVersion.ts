import { execFileSync } from "node:child_process";
import { isNewer, versionNumbers } from "../launcher/updateCheck";

const FIRST_VERSION = "1.0";

export function repositoryTags(repo: string): string[] {
  const tagList = execFileSync("git", ["tag", "--list"], { cwd: repo, encoding: "utf8" });
  return tagList.split(/\r?\n/).filter(Boolean);
}

function isReleaseTag(tag: string): boolean {
  return tag.startsWith("v") && versionNumbers(tag) !== undefined;
}

function latestReleaseTag(tags: string[]): string | undefined {
  let latest: string | undefined;
  for (const tag of tags.filter(isReleaseTag)) {
    if (!latest || isNewer(tag, latest)) {
      latest = tag;
    }
  }
  return latest;
}

function latestReleaseVersion(tags: string[]): [number, number] | undefined {
  const latestTag = latestReleaseTag(tags);
  if (!latestTag) {
    return undefined;
  }
  return versionNumbers(latestTag);
}

export function nextVersion(tags: string[]): string {
  const latest = latestReleaseVersion(tags);
  if (!latest) {
    return FIRST_VERSION;
  }
  const [major, minor] = latest;
  return `${major}.${minor + 1}`;
}
