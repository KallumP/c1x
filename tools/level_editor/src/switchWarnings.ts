// outline boxes whose switch isn't in the level (it was deleted or renumbered
// away): the level won't build until each has a switch again
import type { LevelObject } from "./objects";

// the indices of the outlines among objects whose switch number no switch has
export function switchlessOutlines(objects: LevelObject[]): Set<number> {
  const numbers = new Set(objects.flatMap((object) => object.switch ?? []));
  const isSwitchless = (object: LevelObject) => object.outline !== undefined && !numbers.has(object.outline);
  const indices = objects.map((_, index) => index);
  return new Set(indices.filter((index) => isSwitchless(objects[index])));
}
