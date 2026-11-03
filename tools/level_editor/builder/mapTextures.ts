// a map's textures: texture pages for the materials' images, each tile region
// as a texinfo in the header of the mesh that uses it, and the warp pad's base
import { stringToEid } from "./entryIds";
import type { RgbImage } from "./images";
import { texturePage as texturePageEntry, type Page } from "./levelFiles";
import type { WarpPadBase } from "./templates";
import { tileFromImage } from "./tiles";
import { texinfoBytes, texturePage, TILES_PER_PAGE, type Place } from "./tpage";
import type { Vec3 } from "./vectors";
import { readWorldHeader, WGEO_PAGES, type BuiltPolygon } from "./worldGeometry";
import { isTileRegion, WGEO_MAX, type TileRegion, type WorldMesh, type WorldVertex } from "./worldMeshes";

export const TEXINFO_WORDS_MAX = 4096; // polygons' texinfo indices (in words) are 12 bits

export interface BuiltWorld {
  vertices: WorldVertex[];
  polygons: BuiltPolygon[];
}

// world meshes with their textures laid out: each mesh's own texinfos (after
// its template's), and the texture pages they add
export interface TexturedWorlds {
  worlds: BuiltWorld[];
  texinfos: Buffer[];
  pageEids: number[];
  pages: Page[];
}

// where a material's tile is: the mesh header's texture page slot, and its place on that page
interface TilePlace {
  slot: number;
  place: Place;
}

const regionKey = (region: TileRegion) => `${region.material},${region.x},${region.y},${region.w},${region.h},${region.layout}`;

function texturedMaterials(worlds: WorldMesh[]): string[] {
  const materials = worlds.flatMap(({ polygons }) => polygons.map(({ texture }) => texture).filter(isTileRegion).map(({ material }) => material));
  return [...new Set(materials)].sort();
}

// a texture page for each TILES_PER_PAGE materials, in the slots after the template's own pages
function makeTexturePages(materials: string[], images: Map<string, RgbImage>, firstSlot: number) {
  const pages: Page[] = [];
  const placeOf = new Map<string, TilePlace>();
  for (let start = 0, pageIndex = 0; start < materials.length; start += TILES_PER_PAGE, pageIndex++) {
    const chunk = materials.slice(start, start + TILES_PER_PAGE);
    const eid = stringToEid(`BMp${pageIndex}T`);
    const { page, places } = texturePage(eid, chunk.map((material) => tileFromImage(images.get(material)!)));
    pages.push(texturePageEntry(eid, page));
    chunk.forEach((material, index) => placeOf.set(material, { slot: firstSlot + pageIndex, place: places[index] }));
  }
  return { pages, placeOf };
}

// a mesh with its tile regions turned into texinfos (after the template's
// firstTexinfoWord words) and texture page slots
function textureWorld(world: WorldMesh, placeOf: Map<string, TilePlace>, firstTexinfoWord: number, worldIndex: number) {
  const texinfoIndex = new Map<string, number>();
  const texinfos: Buffer[] = [];
  const nextTexinfo = () => firstTexinfoWord + 2 * texinfos.length; // 2 words each
  const polygons = world.polygons.map(({ corners, texture }): BuiltPolygon => {
    if (!isTileRegion(texture)) {
      return { corners, texinfo: texture.texinfo, page: texture.page };
    }
    const { slot, place } = placeOf.get(texture.material)!;
    const key = regionKey(texture);
    if (!texinfoIndex.has(key)) {
      texinfoIndex.set(key, nextTexinfo());
      texinfos.push(texinfoBytes(place, texture.layout, texture));
    }
    return { corners, texinfo: texinfoIndex.get(key)!, page: slot };
  });
  if (nextTexinfo() > TEXINFO_WORDS_MAX) {
    const regionsMax = Math.floor((TEXINFO_WORDS_MAX - firstTexinfoWord) / 2);
    throw new Error(`world mesh ${worldIndex} uses ${texinfoIndex.size} texture regions, more than its texinfos hold (${regionsMax})`);
  }
  return { world: { vertices: world.vertices, polygons }, texinfos: Buffer.concat(texinfos) };
}

// texture pages for the materials' images that the world meshes' tile regions
// use, and the meshes with each region turned into a texinfo and texture page
// slot, for a mesh header from template. each mesh lists only the regions it
// uses, as the indices only reach TEXINFO_WORDS_MAX words into its header
export function textureWorlds(worlds: WorldMesh[], images: Map<string, RgbImage>, template: Buffer): TexturedWorlds {
  const header = readWorldHeader(template);
  const materials = texturedMaterials(worlds);
  const pagesNeeded = Math.ceil(materials.length / TILES_PER_PAGE);
  const freeSlots = WGEO_PAGES - header.pageCount;
  if (pagesNeeded > freeSlots) {
    throw new Error(`${materials.length} textured materials, more than ${freeSlots * TILES_PER_PAGE}`);
  }
  const { pages, placeOf } = makeTexturePages(materials, images, header.pageCount);
  const textured = worlds.map((world, index) => textureWorld(world, placeOf, header.texinfoWords, index));
  return {
    worlds: textured.map(({ world }) => world),
    texinfos: textured.map(({ texinfos }) => texinfos),
    pageEids: pages.map(({ eid }) => eid),
    pages,
  };
}

// the mesh header's texture page slots with the base's page, and the slot it's in
function slotsWithPage(template: Buffer, pageEids: number[], page: number): { slots: number[]; slot: number } {
  const header = readWorldHeader(template);
  const slots = [...header.pages.slice(0, header.pageCount), ...pageEids];
  if (!slots.includes(page)) {
    if (slots.length >= WGEO_PAGES) {
      throw new Error("no texture page slot left for the warp pad's base");
    }
    slots.push(page);
  }
  return { slots, slot: slots.indexOf(page) };
}

// the textured worlds with the warp pad's base added where the pad stands (at,
// relative to its zone), to whichever of the candidate meshes has the fewest
// polygons, with its texinfos and texture page
export function addWarpPadBase(
  textured: Omit<TexturedWorlds, "pages">, base: WarpPadBase, at: Vec3, template: Buffer, candidates: number[],
): Omit<TexturedWorlds, "pages"> {
  const header = readWorldHeader(template);
  const { slots, slot } = slotsWithPage(template, textured.pageEids, base.page);
  const target = candidates.reduce((fewest, index) =>
    (textured.worlds[index].polygons.length < textured.worlds[fewest].polygons.length ? index : fewest));
  const { vertices, polygons } = textured.worlds[target];

  const baseTexinfos = [...base.texinfos.keys()].sort((first, second) => first - second);
  const ownWords = textured.texinfos[target].length / 4;
  const texinfoIndex = new Map(baseTexinfos.map((texinfo, index) => [texinfo, header.texinfoWords + ownWords + 2 * index]));
  const texinfos = Buffer.concat([textured.texinfos[target], ...baseTexinfos.map((texinfo) => base.texinfos.get(texinfo)!)]);
  if (header.texinfoWords + texinfos.length / 4 > TEXINFO_WORDS_MAX) {
    throw new Error("no room in the mesh's texinfos for the warp pad's base");
  }

  const [dx, dy, dz] = at.map((coordinate) => Math.floor(Math.trunc(coordinate) / 8) * 8);
  const movedVertices = base.vertices.map(({ at: [x, y, z], colour }) => ({ at: [x + dx, y + dy, z + dz] as Vec3, colour }));
  const basePolygons = base.polygons.map(({ corners, texinfo }): BuiltPolygon => ({
    corners: corners.map((corner) => corner + vertices.length) as [number, number, number],
    texinfo: texinfoIndex.get(texinfo)!,
    page: slot,
  }));
  const world = { vertices: [...vertices, ...movedVertices], polygons: [...polygons, ...basePolygons] };
  if (world.vertices.length > WGEO_MAX || world.polygons.length > WGEO_MAX) {
    throw new Error("no room in the mesh for the warp pad's base");
  }

  const worlds = [...textured.worlds];
  const allTexinfos = [...textured.texinfos];
  worlds[target] = world;
  allTexinfos[target] = texinfos;
  return { worlds, texinfos: allTexinfos, pageEids: slots.slice(header.pageCount) };
}
