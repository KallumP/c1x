// a release's name, as the release script makes it and the launcher downloads it

const RELEASE_VERSION = /^\d+\.\d+$/;

// two numbers, like 1.5: a release's tag has a v before it, its version doesn't
export const isReleaseVersion = (version: string) => RELEASE_VERSION.test(version);

// a release's folder, and its zip's name without .zip
export const releaseName = (version: string) => `c1x-${version}`;
