import { describe, expect, test } from "vitest";
import { fileNameOf, isOutsideFolder } from "../../src/imagePaths";

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
