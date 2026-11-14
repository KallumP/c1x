import { describe, expect, test } from "vitest";
import { fileNameOf, isOutsideFolder, levelImageUrl } from "../../src/imagePaths";

describe("a material's image path", () => {
  test("a whole path is outside the level's folder", () => {
    expect(isOutsideFolder("C:\\Users\\me\\textures\\grass.png")).toBe(true);
    expect(isOutsideFolder("C:/Users/me/textures/grass.png")).toBe(true);
    expect(isOutsideFolder("/home/me/textures/grass.png")).toBe(true);
    expect(isOutsideFolder("\\\\server\\share\\grass.png")).toBe(true);
  });

  test("one going up out of the folder is outside it", () => {
    expect(isOutsideFolder("../textures/grass.png")).toBe(true);
    expect(isOutsideFolder("textures\\..\\..\\grass.png")).toBe(true);
  });

  test("one in the folder, or a folder in it, isn't", () => {
    expect(isOutsideFolder("grass.png")).toBe(false);
    expect(isOutsideFolder("textures/grass.png")).toBe(false);
    expect(isOutsideFolder("./textures/../grass.png")).toBe(false);
  });

  test("its file name is after its last slash, either way", () => {
    expect(fileNameOf("C:\\Users\\me\\textures\\grass.png")).toBe("grass.png");
    expect(fileNameOf("../textures/my grass.png")).toBe("my grass.png");
    expect(fileNameOf("grass.png")).toBe("grass.png");
  });
});

describe("a material's image, as the editor asks for it", () => {
  const BASE = "/api/levels/cave/files/";

  test("one outside the level's folder is the file of its name in the folder", () => {
    expect(levelImageUrl(BASE, `${BASE}C:\\Users\\me\\textures\\grass.png`)).toBe(`${BASE}grass.png`);
    expect(levelImageUrl(BASE, `${BASE}../textures/grass.png`)).toBe(`${BASE}grass.png`);
    expect(levelImageUrl(BASE, `${BASE}/home/me/grass.png`)).toBe(`${BASE}grass.png`);
  });

  test("one in the folder is as it is", () => {
    expect(levelImageUrl(BASE, `${BASE}textures/grass.png`)).toBe(`${BASE}textures/grass.png`);
  });

  test("anything else, not the level's, is as it is", () => {
    expect(levelImageUrl(BASE, "data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });
});
