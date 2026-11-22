// c1x_tools check-update <version>: whether GitHub's releases page has a release
// newer than version, the one the launcher was built as (see doc/releasing.md)

export type Release = { tag: string }; // its tag on GitHub, such as v1.4

// a version's two numbers, from 1.4 or a tag such as v1.4; none if it isn't one
export function versionNumbers(_version: string): [number, number] | undefined {
  return undefined;
}

// whether a release tagged tag is newer than version; not if either isn't a version
export function isNewer(_tag: string, _version: string): boolean {
  return false;
}

// what's said of a release newer than version, with its page: "" if latest isn't one
export function newerReleaseLine(_version: string, _latest: Release | undefined): string {
  return "";
}

// the newest release on GitHub; none if it can't be asked
export async function latestRelease(): Promise<Release | undefined> {
  return undefined;
}

// says if there's a release newer than version, and nothing if there isn't or it can't tell
export async function checkUpdate(
  _version: string,
  _log: (line: string) => void,
  _latest: () => Promise<Release | undefined> = latestRelease,
): Promise<void> {}
