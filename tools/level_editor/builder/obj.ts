// reading a map modelled in blender, exported as .obj with its .mtl. the .obj
// is read as blender exports it by default: y up, so its x, y and z are the
// zone's x, y (up) and z
import { isAbsolute, join } from "node:path";
import { pythonModulo } from "./pyMath";
import type { Vec3 } from "./vectors";

export interface Triangle {
  corners: [number, number, number]; // vertex indices
  object: string | null;             // the object it came from (o or g)
  material: string | null;           // its material (usemtl)
}

export type Colour = [number, number, number]; // 0 to 255

export interface Mesh {
  vertices: Vec3[];
  colours?: (Colour | null)[]; // each vertex's colour, if it has one (blender's v x y z r g b)
  triangles: Triangle[];
  materialLibraries: string[]; // the .mtl files the .obj names
}

// (x, z) turned by turn degrees (a multiple of 90) about the up axis, anticlockwise seen from above
export function turned(x: number, z: number, turn: number): [number, number] {
  for (let quarter = 0; quarter < pythonModulo(Math.floor(turn / 90), 4); quarter++) {
    [x, z] = [z, -x + 0]; // + 0 turns -0 into 0
  }
  return [x, z];
}

const splitLines = (text: string) => text.split(/\r\n|\r|\n/);
const splitFields = (line: string) => line.trim().split(/\s+/).filter((field) => field !== "");

// the index (from 0) of a face's vertex, given as f's 1-based (or negative, from the end) index
function vertexIndex(field: string, vertexCount: number, lineNumber: number): number {
  const given = parseInt(field.split("/")[0], 10);
  const index = given > 0 ? given - 1 : vertexCount + given;
  if (!(index >= 0 && index < vertexCount)) {
    throw new Error(`line ${lineNumber}: face uses vertex ${field}, which isn't there`);
  }
  return index;
}

// a vertex colour from v's fields after x, y and z: 0 to 1 each, as blender writes them
function vertexColour(fields: string[]): Colour | null {
  if (fields.length < 3) {
    return null;
  }
  return fields.slice(0, 3).map((field) => Math.round(Number(field) * 255)) as Colour;
}

// a mesh from the text of a .obj: vertices in zone units (scale zone units per
// .obj unit, turned by turn degrees about the up axis), their colours, and
// triangles (polygons are fanned). texture coordinates and normals are ignored
export function readObj(text: string, scale: number, turn = 0): Mesh {
  if (turn % 90 !== 0) {
    throw new Error(`turn (${turn}) has to be a multiple of 90 degrees`);
  }
  const mesh: Mesh = { vertices: [], colours: [], triangles: [], materialLibraries: [] };
  let object: string | null = null;
  let material: string | null = null;
  splitLines(text).forEach((line, index) => {
    const [keyword, ...rest] = splitFields(line);
    const value = rest.join(" ");
    if (keyword === "v") {
      const [x, y, z] = rest.slice(0, 3).map((field) => Number(field) * scale);
      const [turnedX, turnedZ] = turned(x, z, turn);
      mesh.vertices.push([turnedX, y, turnedZ]);
      mesh.colours!.push(vertexColour(rest.slice(3)));
    } else if (keyword === "o" || keyword === "g") {
      object = value;
    } else if (keyword === "usemtl") {
      material = value;
    } else if (keyword === "mtllib") {
      mesh.materialLibraries.push(value);
    } else if (keyword === "f") {
      const corners = rest.map((field) => vertexIndex(field, mesh.vertices.length, index + 1));
      for (let k = 1; k < corners.length - 1; k++) {
        mesh.triangles.push({ corners: [corners[0], corners[k], corners[k + 1]], object, material });
      }
    }
  });
  return mesh;
}

// options map_Kd can have before its file, and how many values each takes
const MAP_OPTIONS: Record<string, number> = {
  "-blendu": 1, "-blendv": 1, "-bm": 1, "-boost": 1, "-cc": 1, "-clamp": 1,
  "-imfchan": 1, "-mm": 2, "-o": 3, "-s": 3, "-t": 3, "-texres": 1,
};

function imagePathOf(mapFields: string[]): string {
  let rest = mapFields;
  while (rest.length && rest[0] in MAP_OPTIONS) {
    rest = rest.slice(1 + MAP_OPTIONS[rest[0]]);
  }
  return rest.join(" ");
}

// each material's diffuse image (map_Kd) from the text of a .mtl, relative to
// baseDir (where the .mtl is) unless absolute. materials without one are left out
export function readMtl(text: string, baseDir: string): Map<string, string> {
  const images = new Map<string, string>();
  let material: string | null = null;
  for (const line of splitLines(text)) {
    const [keyword, ...rest] = splitFields(line);
    if (keyword === "newmtl") {
      material = rest.join(" ");
    } else if (keyword === "map_Kd" && material !== null) {
      const path = imagePathOf(rest);
      images.set(material, isAbsolute(path) ? path : join(baseDir, path));
    }
  }
  return images;
}
