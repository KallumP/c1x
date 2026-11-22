// c1x_tools check-update <version>: whether GitHub's releases page has a release
// newer than version, the one the launcher was built as (see doc/releasing.md)

export type Release = { tag: string }; // its tag on GitHub, such as v1.4

const RELEASES_PAGE = "https://github.com/KallumP/c1x/releases";
const LATEST_RELEASE = "https://api.github.com/repos/KallumP/c1x/releases/latest";
const TIMEOUT_MS = 10000;

// what the launcher looks for in the output, before the version and its page
const NEWER_RELEASE = "newer release:";

// a version's two numbers, from 1.4 or a tag such as v1.4; none if it isn't one
export function versionNumbers(version: string): [number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

// whether a release tagged tag is newer than version; not if either isn't a version
export function isNewer(tag: string, version: string): boolean {
  const latest = versionNumbers(tag);
  const current = versionNumbers(version);
  if (!latest || !current) {
    return false;
  }
  return latest[0] > current[0] || (latest[0] === current[0] && latest[1] > current[1]);
}

// what's said of a release newer than version, with its page: "" if latest isn't one
export function newerReleaseLine(version: string, latest: Release | undefined): string {
  if (!latest || !isNewer(latest.tag, version)) {
    return "";
  }
  return `${NEWER_RELEASE} ${latest.tag.replace(/^v/, "")} ${RELEASES_PAGE}/tag/${latest.tag}`;
}

// the newest release on GitHub (not a draft or a pre-release); none if it can't be asked
export async function latestRelease(): Promise<Release | undefined> {
  try {
    const response = await fetch(LATEST_RELEASE, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "c1x-launcher" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return undefined;
    }
    const { tag_name: tag } = (await response.json()) as { tag_name?: unknown };
    return typeof tag === "string" ? { tag } : undefined;
  } catch {
    return undefined; // offline, or GitHub didn't answer
  }
}

// says if there's a release newer than version, and nothing if there isn't or it can't tell
export async function checkUpdate(
  version: string,
  log: (line: string) => void,
  latest: () => Promise<Release | undefined> = latestRelease,
): Promise<void> {
  const line = newerReleaseLine(version, await latest());
  if (line) {
    log(line);
  }
}
