// a model drawn from both sides: the game culls a model's polygons facing away
// from the camera unless their texture info says not to (no_cull, src/geom.h),
// so a model the game only shows from outside is see-through from inside
import type { Entry } from "./levelFiles";

const HEADER = 0;           // a model's items: its header, then its polygons
const TEXINFOS = 20;        // where its texture infos start in its header, after its poly count, scale and texinfo count
const NO_CULL = 1 << 28;    // a texture info's colour word: draw both sides
const TEXTURED = 1 << 31;   // and whether it's textured, with a second word after it

// model with every texture info set to draw both sides of its polygons
export function withBothSidesDrawn(model: Entry): Entry {
  const header = Buffer.from(model.items[HEADER]);
  for (let at = TEXINFOS; at + 4 <= header.length; at += texinfoBytes(header.readUInt32LE(at))) {
    header.writeUInt32LE((header.readUInt32LE(at) | NO_CULL) >>> 0, at);
  }
  return { ...model, items: model.items.map((item, index) => (index === HEADER ? header : item)) };
}

// how long a texture info is, from its colour word: a second word if it's textured
function texinfoBytes(colour: number): number {
  if (colour & TEXTURED) {
    return 8;
  }
  return 4;
}
