// outline boxes whose switch isn't in the level (it was deleted or renumbered
// away): the level won't build until each has a switch again
import { messageName } from "./objectNames";
import type { LevelObject } from "./objects";

// the indices of the outlines among objects whose switch number no switch has
export function switchlessOutlines(objects: LevelObject[]): Set<number> {
  const numbers = new Set(objects.flatMap((object) => object.switch ?? []));
  const isSwitchless = (object: LevelObject) => object.outline !== undefined && !numbers.has(object.outline);
  const indices = objects.map((_, index) => index);
  return new Set(indices.filter((index) => isSwitchless(objects[index])));
}

export interface OutlineError {
  index: number; // the outline's, to select it
  text: string;
}

// an error for each outline whose switch isn't in the level: which box, where, and its missing switch
export function switchlessOutlineErrors(objects: LevelObject[]): OutlineError[] {
  return [...switchlessOutlines(objects)].map((index) => {
    const outline = objects[index];
    const where = outline.at.join(", ");
    const switchNumber = outline.outline;
    const text = `${messageName(outline)} at ${where} is an outline of switch ${switchNumber}, `
      + `but the level has no switch ${switchNumber}, so it can't be built`;
    return { index, text };
  });
}
