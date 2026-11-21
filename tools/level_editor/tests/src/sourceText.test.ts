import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const EDITOR = fileURLToPath(new URL("../..", import.meta.url));
const FOLDERS = ["src", "builder", "server", "scripts"];
const SOURCE = /\.(ts|tsx|css|html)$/;

// text saved as utf-8 then read as latin-1 and saved again: × comes out as Ã—, ° as Â°, ’ as â€™
const GARBLED = /Ã.|Â.|â€/;

// each source file's lines that have garbled characters in them, as file:line: text
function garbledLines(): string[] {
  return FOLDERS.flatMap((folder) =>
    readdirSync(join(EDITOR, folder), { recursive: true, encoding: "utf8" })
      .filter((file) => SOURCE.test(file))
      .flatMap((file) =>
        readFileSync(join(EDITOR, folder, file), "utf8")
          .split("\n")
          .flatMap((line, index) => (GARBLED.test(line) ? [`${folder}/${file}:${index + 1}: ${line.trim()}`] : [])),
      ),
  );
}

describe("the editor's source text", () => {
  test("has no garbled characters, such as Ã— for ×", () => {
    expect(garbledLines()).toEqual([]);
  });
});
