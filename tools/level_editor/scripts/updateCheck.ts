// c1x_tools check-update <version>: whether GitHub has a release of c1x newer
// than version, the one the launcher was built as (see doc/releasing.md)

// GitHub's latest release by its tag, such as v1.4, or why it can't be told
export type LatestRelease = { tag: string } | { problem: string };
// fetch, or a test's stand-in for it
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const LATEST_RELEASE_API_URL = "https://api.github.com/repos/KallumP/c1x/releases/latest";
const TIMEOUT_MS = 10000;

// what's said before a newer release's version, which the launcher looks for.
// newer_release.c has the same text, and a test checks the two are the same
export const NEWER_RELEASE_PREFIX = "newer release: ";

// a version's two numbers, from 1.4 or a tag such as v1.4; none if it isn't one
export function versionNumbers(version: string): [number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

export function isNewer(release: string, than: string): boolean {
  const releaseNumbers = versionNumbers(release);
  const thanNumbers = versionNumbers(than);
  if (!releaseNumbers || !thanNumbers) {
    return false;
  }
  const [releaseMajor, releaseMinor] = releaseNumbers;
  const [thanMajor, thanMinor] = thanNumbers;
  if (releaseMajor !== thanMajor) {
    return releaseMajor > thanMajor;
  }
  return releaseMinor > thanMinor;
}

// the tag in GitHub's answer about a release, if it has one
function tagIn(answer: unknown): string | undefined {
  const tag = (answer as { tag_name?: unknown } | null)?.tag_name;
  return typeof tag === "string" ? tag : undefined;
}

// c1x's latest release on GitHub (not a draft or a pre-release)
export async function latestRelease(fetchUrl: Fetch = fetch): Promise<LatestRelease> {
  try {
    const response = await fetchUrl(LATEST_RELEASE_API_URL, {
      // GitHub's API refuses a request that doesn't say what's asking
      headers: { Accept: "application/vnd.github+json", "User-Agent": "c1x-launcher" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return { problem: `GitHub answered ${response.status}` };
    }
    const tag = tagIn(await response.json());
    return tag === undefined ? { problem: "GitHub's answer has no tag" } : { tag };
  } catch (error) {
    return { problem: `GitHub couldn't be reached (${error instanceof Error ? error.message : error})` };
  }
}

// says whether there's a release newer than version: the line the launcher
// reads if there is one, and otherwise that there isn't, or why it can't tell.
// returns the exit code, 1 when it can't tell. askLatest is a test's stand-in
export async function checkUpdate(
  version: string,
  say: (line: string) => void,
  askLatest: () => Promise<LatestRelease> = latestRelease,
): Promise<number> {
  if (!versionNumbers(version)) {
    say(`"${version}" isn't a version: it has to be two numbers, like 1.3`);
    return 1;
  }
  const latest = await askLatest();
  if ("problem" in latest) {
    say(`couldn't tell the latest release: ${latest.problem}`);
    return 1;
  }
  const latestNumbers = versionNumbers(latest.tag);
  if (!latestNumbers) {
    say(`couldn't tell the latest release: its tag "${latest.tag}" isn't a version`);
    return 1;
  }
  if (!isNewer(latest.tag, version)) {
    say(`no release is newer than ${version}`);
    return 0;
  }
  say(`${NEWER_RELEASE_PREFIX}${latestNumbers.join(".")}`);
  return 0;
}
