import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { describe, expect, test } from "vitest";
import { buildLevel, fittingScale, levelSource, levelSourcePath, mapImages } from "../../builder/buildLevel";
import { eidToString } from "../../builder/entryIds";
import { fit, TooBig } from "../../builder/fit";
import { texturePage, TILE } from "../../builder/tpage";
import { boxMesh } from "./meshes";

const newFolder = (name: string) => {
  const folder = join(mkdtempSync(join(tmpdir(), "build-level-")), name);
  mkdirSync(folder);
  return folder;
};

// the error a function throws
function errorThrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("it didn't throw");
}

function writePng(path: string, rgb: [number, number, number]): void {
  const png = new PNG({ width: 4, height: 4 });
  for (let pixel = 0; pixel < 16; pixel++) {
    png.data.set([...rgb, 255], pixel * 4);
  }
  writeFileSync(path, PNG.sync.write(png));
}

describe("a level source", () => {
  test("a folder gives its .obj, and the folder's name", () => {
    const folder = newFolder("my_level");
    writeFileSync(join(folder, "level.obj"), "");
    writeFileSync(join(folder, "level.mtl"), "");
    expect(levelSource(folder)).toEqual({ objPath: join(folder, "level.obj"), name: "my_level" });
    expect(levelSource(folder + sep)).toEqual({ objPath: join(folder, "level.obj"), name: "my_level" });
  });

  test("a .obj gives itself, and its name", () => {
    const path = join("level_src", "x", "level.obj");
    expect(levelSource(path)).toEqual({ objPath: path, name: "level" });
  });

  test("a folder needs one .obj", () => {
    const two = newFolder("two");
    writeFileSync(join(two, "a.obj"), "");
    writeFileSync(join(two, "b.obj"), "");
    expect(() => levelSource(two)).toThrow(/2 \.obj files/);
    expect(() => levelSource(newFolder("none"))).toThrow(/0 \.obj files/);
  });
});

describe("a map's images", () => {
  test("are read from the .mtl next to the .obj", () => {
    const folder = newFolder("textured");
    mkdirSync(join(folder, "textures"));
    writePng(join(folder, "textures", "stone.png"), [90, 90, 100]);
    writeFileSync(join(folder, "level.mtl"), "newmtl stone\nmap_Kd textures/stone.png\nnewmtl plain\nKd 1 1 1\n");
    const images = mapImages(join(folder, "level.obj"), "mtllib level.mtl\no Floor\nusemtl stone\n", () => {});
    expect([...images.keys()]).toEqual(["stone"]);
    expect([...images.get("stone")!.rgb.subarray(0, 3)]).toEqual([90, 90, 100]);
  });

  test("missing ones are warned about and left out", () => {
    const folder = newFolder("missing");
    writeFileSync(join(folder, "level.mtl"), "newmtl stone\nmap_Kd stone.png\n");
    const warnings: string[] = [];
    const images = mapImages(join(folder, "level.obj"), "mtllib level.mtl\nmtllib other.mtl\n", (line) => warnings.push(line));
    expect(images.size).toBe(0);
    expect(warnings).toEqual([
      expect.stringMatching(/stone\.png \(material stone\) not found, so it is untextured/),
      expect.stringMatching(/other\.mtl not found, so its materials are untextured/),
    ]);
  });
});

describe("building a level", () => {
  test("too big says the largest scale, on a 10, that fits", () => {
    // a map 20 metres long, with a margin that doesn't scale
    const fitAtScale = (scale: number) => fit(boxMesh(0, 0, 0, 20 * scale, 10, 10), 128, 0, 128);
    const tooBig = errorThrownBy(() => fitAtScale(1000));
    expect(tooBig).toBeInstanceOf(TooBig);
    const suggested = fittingScale(1000, tooBig as TooBig);
    expect(() => fitAtScale(suggested)).not.toThrow();
    expect(() => fitAtScale(suggested + 10)).toThrow(TooBig);
  });

  const quietBuild = (source: string, streamsDir = "streams") => {
    const lines: string[] = [];
    const ok = buildLevel(source, { streamsDir, levelsDir: newFolder("levels"), log: (line) => lines.push(line) });
    return { ok, output: lines.join("\n") };
  };

  test.each([
    { problem: "a bad level.cfg", files: { "x.obj": "", "level.cfg": "scale = big\n" }, message: /level\.cfg, line 1/ },
    { problem: "a bad objects.json", files: { "x.obj": "", "objects.json": '[{"kind": "crate", "at": [0, 0, 0]}]' }, message: /objects\.json/ },
    { problem: "a folder without a .obj", files: {}, message: /0 \.obj files/ },
  ])("$problem stops the build with its message", ({ files, message }) => {
    const folder = newFolder("bad_source");
    Object.entries(files).forEach(([file, text]) => writeFileSync(join(folder, file), text));
    expect(quietBuild(folder)).toEqual({ ok: false, output: expect.stringMatching(message) });
  });

  const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));

  test.skipIf(!existsSync(join(STREAMS, "s0000009.nsd")))("a level source is written to the levels folder", () => {
    const folder = newFolder("tiny");
    writeFileSync(join(folder, "tiny.obj"), "o Floor\nv -4 0 -8\nv -4 0 8\nv 4 0 8\nv 4 0 -8\nf 1 2 3 4\n");
    const levelsDir = newFolder("levels");
    const lines: string[] = [];
    expect(buildLevel(folder, { streamsDir: STREAMS, levelsDir, log: (line) => lines.push(line) })).toBe(true);
    expect(lines).toEqual([`wrote ${join(levelsDir, "tiny")}`]);
    expect(existsSync(join(levelsDir, "tiny.nsd"))).toBe(true);
    expect(existsSync(join(levelsDir, "tiny.nsf"))).toBe(true);
  });

  const crabLevel = () => {
    const folder = newFolder("crabby");
    writeFileSync(join(folder, "crabby.obj"), "o Floor\nv -4 0 -8\nv -4 0 8\nv 4 0 8\nv 4 0 -8\nf 1 2 3 4\n");
    writeFileSync(join(folder, "objects.json"), '[{"kind": "enemy", "type": "crab", "at": [0, 0, 0]}]');
    return folder;
  };
  const hasStreams = ["s0000009", "s000000c"].every((file) => existsSync(join(STREAMS, `${file}.nsd`)));

  test.skipIf(!hasStreams)("a level with an enemy takes its code from the streams folder", () => {
    // a crab, from n. sanity beach
    expect(quietBuild(crabLevel(), STREAMS)).toEqual({ ok: true, output: expect.stringMatching(/^wrote /) });
  });

  test.skipIf(!hasStreams)("a level whose enemy's donor level is missing stops with a message saying so", () => {
    // a crab, without n. sanity beach in the streams folder
    const streams = newFolder("streams");
    ["nsd", "nsf"].forEach((extension) => copyFileSync(join(STREAMS, `s000000c.${extension}`), join(streams, `s000000c.${extension}`)));
    expect(quietBuild(crabLevel(), streams)).toEqual({ ok: false, output: expect.stringMatching(/N\. Sanity Beach \(s0000009\.nsd\).*crab/) });
  });

  // the game's files, with s0000004.nsf only a test texture page; and a level
  // source whose one material is a region of it, named in its game_textures.json
  const TEXTURE_PAGE_EID = 0x12345671;
  function streamsWithTexturePage(): string {
    const streams = newFolder("streams");
    ["s0000009", "s000000c"].forEach((file) => ["nsd", "nsf"].forEach((extension) =>
      copyFileSync(join(STREAMS, `${file}.${extension}`), join(streams, `${file}.${extension}`))));
    const tile = { pixels: Array(TILE * TILE).fill(3), palette: Array(16).fill(0x7c00) };
    writeFileSync(join(streams, "s0000004.nsf"), texturePage(TEXTURE_PAGE_EID, [tile]).page);
    return streams;
  }
  function gameTexturedLevel(stream: string): string {
    const folder = newFolder("cave");
    writeFileSync(join(folder, "cave.obj"), "mtllib cave.mtl\no Floor\nusemtl rock\nv -4 0 -8\nv -4 0 8\nv 4 0 8\nv 4 0 -8\nvt 0 0\nvt 0 1\nvt 1 1\nvt 1 0\nf 1/1 2/2 3/3 4/4\n");
    writeFileSync(join(folder, "cave.mtl"), "newmtl rock\nmap_Kd rock.png\n");
    const region = { stream, page: eidToString(TEXTURE_PAGE_EID), colourMode: 0, x: 0, y: 0, w: 16, h: 16, clutX: 0, clutY: 0 };
    writeFileSync(join(folder, "game_textures.json"), JSON.stringify({ "rock.png": region }));
    return folder;
  }

  test.skipIf(!hasStreams)("a level's game textures are made from the game's files before its images are read", () => {
    const folder = gameTexturedLevel("s0000004");
    expect(quietBuild(folder, streamsWithTexturePage())).toEqual({ ok: true, output: expect.stringMatching(/^wrote /) });
    expect(existsSync(join(folder, "rock.png"))).toBe(true);
  });

  test.skipIf(!hasStreams)("a level whose game texture's stream is missing stops with a message saying so", () => {
    const output = quietBuild(gameTexturedLevel("s0000014"), streamsWithTexturePage());
    expect(output).toEqual({ ok: false, output: expect.stringMatching(/rock\.png is from the game's s0000014\.nsf, which isn't in /) });
  });
});

describe("the level to build", () => {
  test("a level source's name is its folder in level_src", () => {
    const sources = newFolder("level_src");
    mkdirSync(join(sources, "tide_ruins"));
    expect(levelSourcePath("tide_ruins", sources)).toBe(join(sources, "tide_ruins"));
  });

  test("a path is itself", () => {
    const folder = newFolder("elsewhere");
    expect(levelSourcePath(folder, newFolder("level_src"))).toBe(folder);
  });
});
