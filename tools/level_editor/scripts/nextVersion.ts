// the version the next release gets, from the releases' tags (v1.4 and so on,
// see doc/releasing.md): one more than the latest. release.bat suggests it
import { versionNumbers } from "./updateCheck";

type Version = [number, number];

const FIRST_VERSION: Version = [1, 0];

// whether version is a later release than other
function isLater(version: Version, other: Version): boolean {
  const [major, minor] = version;
  const [otherMajor, otherMinor] = other;
  if (major !== otherMajor) {
    return major > otherMajor;
  }
  return minor > otherMinor;
}

// the versions of the tags that are releases', as numbers; the rest are left out
function releaseVersions(tags: string[]): Version[] {
  return tags.flatMap((tag) => {
    const numbers = versionNumbers(tag);
    if (!numbers || !tag.startsWith("v")) {
      return [];
    }
    return [numbers];
  });
}

// the latest release's version, or none without a release
function latestVersion(tags: string[]): Version | undefined {
  let latest: Version | undefined;
  for (const version of releaseVersions(tags)) {
    if (!latest || isLater(version, latest)) {
      latest = version;
    }
  }
  return latest;
}

// the next release's version: the latest's with one more second number, or
// 1.0 for the first release
export function nextVersion(tags: string[]): string {
  const latest = latestVersion(tags);
  if (!latest) {
    return FIRST_VERSION.join(".");
  }
  const [major, minor] = latest;
  return `${major}.${minor + 1}`;
}
