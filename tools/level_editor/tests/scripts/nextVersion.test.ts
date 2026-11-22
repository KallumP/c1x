import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { nextVersion, repositoryTags } from "../../scripts/nextVersion";

// who the test repository's commit is by, as git won't commit without one
const TEST_AUTHOR = ["-c", "user.name=test", "-c", "user.email=test@example.com"];

// a git repository of its own, with one commit and the tags given
function repoTagged(tags: string[]): string {
  const repo = mkdtempSync(join(tmpdir(), "next-version-"));
  const git = (...args: string[]) => {
    execFileSync("git", args, { cwd: repo, stdio: "pipe" });
  };
  git("init", "-q");
  git(...TEST_AUTHOR, "commit", "-q", "--allow-empty", "-m", "first");
  tags.forEach((tag) => git("tag", tag));
  return repo;
}

describe("the repository's tags", () => {
  test("are every tag, release or not", () => {
    const tags = repositoryTags(repoTagged(["v1.4", "v1.2.0"]));
    expect(tags.sort()).toEqual(["v1.2.0", "v1.4"]);
  });

  test("are none in a repository without tags", () => {
    expect(repositoryTags(repoTagged([]))).toEqual([]);
  });
});

describe("the next release's version", () => {
  test("is one more than the latest release's tag", () => {
    expect(nextVersion(["v1.3", "v1.4"])).toBe("1.5");
  });

  test("takes the highest tag as the latest, not the last listed", () => {
    expect(nextVersion(["v1.4", "v1.3"])).toBe("1.5");
  });

  test("compares tags as numbers, so 1.10 is after 1.9", () => {
    expect(nextVersion(["v1.9", "v1.10"])).toBe("1.11");
  });

  test("takes a higher first number over a higher second", () => {
    expect(nextVersion(["v1.9", "v2.0"])).toBe("2.1");
  });

  test("ignores a tag of three numbers", () => {
    expect(nextVersion(["v1.4", "v1.5.0"])).toBe("1.5");
  });

  test("ignores a tag that isn't a version", () => {
    expect(nextVersion(["v1.4", "nightly"])).toBe("1.5");
  });

  test("ignores a version tag without a v", () => {
    expect(nextVersion(["v1.4", "1.6"])).toBe("1.5");
  });

  test("is 1.0 without a release", () => {
    expect(nextVersion([])).toBe("1.0");
  });
});
