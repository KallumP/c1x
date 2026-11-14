import { describe, expect, test } from "vitest";
import { docLink, headingSlug, htmlDocPage } from "../../scripts/htmlDocs";

describe("a doc's heading anchors", () => {
  test("are its words, lower case, joined by hyphens, as github's are", () => {
    expect(headingSlug("Level editor")).toBe("level-editor");
    expect(headingSlug("1. Make the map in Blender")).toBe("1-make-the-map-in-blender");
  });

  test("leave out punctuation, but keep hyphens and underscores", () => {
    expect(headingSlug("What's in the zip")).toBe("whats-in-the-zip");
    expect(headingSlug("game_textures.json, and c1x-tools")).toBe("game_texturesjson-and-c1x-tools");
  });
});

describe("a link in a doc", () => {
  test("to another doc is to its page", () => {
    expect(docLink("doc/controls.md")).toBe("doc/controls.html");
    expect(docLink("../level_src/README.md")).toBe("../level_src/README.html");
  });

  test("keeps where in the doc it goes", () => {
    expect(docLink("launcher.md#level-editor")).toBe("launcher.html#level-editor");
    expect(docLink("#textures-from-the-game")).toBe("#textures-from-the-game");
  });

  test("to the licence is to its text file, which a browser shows", () => {
    expect(docLink("LICENSE")).toBe("LICENSE.txt");
    expect(docLink("../LICENSE")).toBe("../LICENSE.txt");
  });

  test("to a website, or anything else, is as it is", () => {
    expect(docLink("https://nodejs.org/")).toBe("https://nodejs.org/");
    expect(docLink("https://github.com/x/y/README.md")).toBe("https://github.com/x/y/README.md");
    expect(docLink("streams/")).toBe("streams/");
  });
});

describe("a doc's page", () => {
  const page = htmlDocPage("# Running\n\nSee [Controls](controls.md#keys) and [Node](https://nodejs.org/).\n\n## Keys\n\n## Keys\n");

  test("is a whole html page, titled by its first heading", () => {
    expect(page).toMatch(/^<!doctype html>/);
    expect(page).toContain("<title>c1x: Running</title>");
    expect(page).toContain('<meta charset="utf-8">');
  });

  test("has its headings with anchors, a second of the same name numbered as github does", () => {
    expect(page).toContain('<h1 id="running">Running</h1>');
    expect(page).toContain('<h2 id="keys">Keys</h2>');
    expect(page).toContain('<h2 id="keys-1">Keys</h2>');
  });

  test("has its links to other docs as links to their pages", () => {
    expect(page).toContain('<a href="controls.html#keys">Controls</a>');
    expect(page).toContain('<a href="https://nodejs.org/">Node</a>');
  });

  test("has its tables and code as html", () => {
    const tablePage = htmlDocPage("# Files\n\n| a | b |\n|---|---|\n| `c1x.exe` | the game |\n");
    expect(tablePage).toContain("<table>");
    expect(tablePage).toContain("<code>c1x.exe</code>");
  });

  test("a heading with code or emphasis has its anchor from its words", () => {
    expect(htmlDocPage("## The `level.cfg` **file**\n")).toContain('<h2 id="the-levelcfg-file">');
  });

  test("its text is escaped", () => {
    expect(htmlDocPage("# A & B\n")).toContain("<title>c1x: A &amp; B</title>");
  });
});

describe("a doc's page, with its own links", () => {
  test("has its links to other docs as the release says they go", () => {
    const page = htmlDocPage("# Running\n\nSee [Building](building.md).\n", (href) => `https://example.com/${href}`);
    expect(page).toContain('<a href="https://example.com/building.md">Building</a>');
  });
});
