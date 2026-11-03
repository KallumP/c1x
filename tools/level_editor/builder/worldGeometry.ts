// world mesh entries' bytes (wgeo, see src/formats/wgeo.h; its bitfield macros
// list fields high bits first): the header, polygons and vertices
import { ByteWriter, readWords } from "./bytes";
import type { Vec3 } from "./vectors";
import type { WorldVertex } from "./worldMeshes";

export const WGEO_PAGES = 8;   // texture page slots in a mesh header
const HEADER_FIELDS_SIZE = 32;  // trans x y z, poly, vert, texinfo and tpag counts, is_backdrop
export const TEXINFOS_AT = HEADER_FIELDS_SIZE + 4 * WGEO_PAGES;

// a polygon once its texture is known: a texinfo (a word index into the
// mesh's texinfos) on a texture page slot
export interface BuiltPolygon {
  corners: [number, number, number];
  texinfo: number;
  page: number;
}

export interface WorldHeader {
  origin: Vec3;
  polygonCount: number;
  vertexCount: number;
  texinfoWords: number;
  pageCount: number;
  isBackdrop: number;
  pages: number[]; // WGEO_PAGES slots
}

export function readWorldHeader(header: Buffer): WorldHeader {
  return {
    origin: [header.readInt32LE(0), header.readInt32LE(4), header.readInt32LE(8)],
    polygonCount: header.readUInt32LE(12),
    vertexCount: header.readUInt32LE(16),
    texinfoWords: header.readUInt32LE(20),
    pageCount: header.readUInt32LE(24),
    isBackdrop: header.readUInt32LE(28),
    pages: readWords(header, HEADER_FIELDS_SIZE, WGEO_PAGES),
  };
}

// a mesh header from a real one (keeping its texture pages and texinfos),
// placed at origin with new counts, and more texture pages (in its free slots)
// and texinfos added after its own
export function worldHeaderBytes(
  template: Buffer, origin: Vec3, polygonCount: number, vertexCount: number, morePages: number[] = [], moreTexinfos = Buffer.alloc(0),
): Buffer {
  const fields = readWorldHeader(template);
  const pages = [...fields.pages];
  pages.splice(fields.pageCount, morePages.length, ...morePages);
  const writer = new ByteWriter()
    .s32(origin[0]).s32(origin[1]).s32(origin[2]).u32(polygonCount).u32(vertexCount)
    .u32(fields.texinfoWords + moreTexinfos.length / 4).u32(fields.pageCount + morePages.length).u32(fields.isBackdrop);
  pages.slice(0, WGEO_PAGES).forEach((page) => writer.u32(page));
  return writer.bytes(template.subarray(TEXINFOS_AT)).bytes(moreTexinfos).toBuffer();
}

// a vertex relative to its mesh, in zone units (multiples of 8, within -32768..32760), and its colour
export function worldVertexBytes({ at, colour }: WorldVertex): Buffer {
  const [x, y, z] = at.map((coordinate) => Math.floor(coordinate / 8));
  const high0 = ((x & 0x1fff) << 3) | (((z >> 8) & 3) << 1);  // x:13, z2:2, fx:1
  const high1 = ((y & 0x1fff) << 3) | ((z >> 10) & 7);        // y:13, z3:3
  return new ByteWriter().u8(colour[0]).u8(colour[1]).u8(colour[2]).u8(z & 0xff).u16(high0).u16(high1).toBuffer();
}

const signed = (value: number, bits: number) => (value & (1 << (bits - 1)) ? value - (1 << bits) : value);

export function readWorldVertex(data: Buffer): WorldVertex {
  const [z8, high0, high1] = [data[3], data.readUInt16LE(4), data.readUInt16LE(6)];
  const z = signed(z8 | (((high0 >> 1) & 3) << 8) | ((high1 & 7) << 10), 13);
  return { at: [signed(high0 >> 3, 13) * 8, signed(high1 >> 3, 13) * 8, z * 8], colour: [data[0], data[1], data[2]] };
}

// a triangle of vertex indices with a texinfo on a texture page slot, not animated
export function worldPolygonBytes({ corners: [a, b, c], texinfo, page }: BuiltPolygon): Buffer {
  const word0 = ((c << 20) | (texinfo << 8) | (page << 5)) >>> 0; // c, tinf, tpag, anim_phase
  const word1 = ((a << 20) | (b << 8)) >>> 0;                     // a, b, anim_period, anim_mask
  return new ByteWriter().u32(word0).u32(word1).toBuffer();
}

export function readWorldPolygon(data: Buffer): BuiltPolygon {
  const [word0, word1] = [data.readUInt32LE(0), data.readUInt32LE(4)];
  return { corners: [word1 >>> 20, (word1 >>> 8) & 0xfff, word0 >>> 20], texinfo: (word0 >>> 8) & 0xfff, page: (word0 >>> 5) & 7 };
}
