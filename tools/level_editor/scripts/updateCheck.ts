// c1x_tools check-update <version>: whether GitHub has a release of c1x newer
// than version, the one the launcher was built as (see doc/releasing.md)

// GitHub's latest release by its tag, such as v1.4, or why it can't be told
export type LatestRelease = { tag: string } | { problem: string };
// fetch, or a test's stand-in for it
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// what's said before a newer release's version, which the launcher looks for
export const NEWER_RELEASE_PREFIX = "newer release: ";

// a version's two numbers, from 1.4 or a tag such as v1.4; none if it isn't one
export function versionNumbers(_version: string): [number, number] | undefined {
  return undefined;
}

// whether the release tagged latestTag is newer than version; not if either isn't a version
export function isNewer(_version: string, _latestTag: string): boolean {
  return false;
}

// c1x's latest release on GitHub (not a draft or a pre-release)
export async function latestRelease(_fetchUrl: Fetch = fetch): Promise<LatestRelease> {
  return { problem: "" };
}

// says whether there's a release newer than version; returns the exit code
export async function checkUpdate(
  _version: string,
  _say: (line: string) => void,
  _askLatest: () => Promise<LatestRelease> = latestRelease,
): Promise<number> {
  return 0;
}
