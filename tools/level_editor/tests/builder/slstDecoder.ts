// decoding sort list items the way the game does (SlstUpdate in src/slst.c), to
// check what the level build writes

// a sort list item's length, type and its 16 bit words after them
export function slstWords(item: Buffer): { length: number; type: number; words: number[] } {
  const length = item.readUInt16LE(0);
  const words = Array.from({ length }, (_, index) => item.readUInt16LE(4 + 2 * index));
  return { length, type: item.readUInt16LE(2), words };
}

// slst_context in src/slst.c, reading add or remove nodes from words start up to end
class NodeReader {
  index = 0;
  length = 0;
  count = 0;
  poly = 0;
  private at: number;

  constructor(private words: number[], start: number, private end: number) {
    this.at = start;
  }

  private word(): number {
    const word = this.at < this.words.length ? this.words[this.at] : 0xffff;
    this.at++;
    return word;
  }

  // SlstRemNext / SlstAddNext
  next(): void {
    if (this.length > 0) {
      this.poly = this.word();
      this.index += this.poly >> 15;
      return;
    }
    const node = this.word();
    if (this.at < this.end && node !== 0xffff) {
      this.index = node & 0xfff;
      this.length = ((node & 0xf000) >> 12) + 1;
    } else {
      this.index = 0xffff00;
      this.length = 0;
    }
    if (this.length > 0) {
      this.poly = this.word();
    }
  }
}

// how many ids to copy across unchanged before the next add or remove
function copyRun(remove: NodeReader, add: NodeReader, at: number, sourceLength: number, forward: boolean): number {
  if (forward) {
    const run = Math.min(add.index + remove.count - at, remove.index - (at + 1), sourceLength - (at + 1));
    return run === 0 ? 1 : run;
  }
  const run = Math.min(add.index + (remove.count - add.count) - (at + 1), remove.index + remove.count - at, sourceLength - (at + 1));
  return run <= 0 ? 1 : run;
}

// SlstUpdate on source (a list of poly ids): a full list is copied, a change
// applied forward (SlstDecodeForward) or backward (SlstDecodeBackward). the
// changes here have no swaps
export function slstDecode(item: Buffer, source: number[], forward: boolean): number[] {
  const { length, type, words } = slstWords(item);
  if (!(type & 1)) {
    return words;
  }
  const [split, swaps] = words;
  if (swaps !== length) {
    throw new Error("a change with swaps");
  }
  const first = new NodeReader(words, 2, split);
  const second = new NodeReader(words, split, swaps);
  const [remove, add] = forward ? [first, second] : [second, first];
  remove.next();
  add.next();
  let at = 0;
  const result: number[] = [];
  for (let guard = 0; guard < 100000; guard++) {
    const removes = forward
      ? at < source.length && remove.length > 0 && remove.index - 1 - at === 0
      : at < source.length && remove.length > 0 && remove.index + remove.count - at === 0;
    const adds = forward
      ? add.length > 0 && add.index + remove.count - at === 0
      : add.length > 0 && add.index + remove.count - (add.count + 1) - at === 0;
    if (removes) {
      at++;
      remove.length--;
      remove.count++;
      remove.next();
    } else if (adds) {
      result.push(add.poly & 0x7fff);
      add.length--;
      add.count++;
      add.next();
    } else if (at < source.length) {
      const run = copyRun(remove, add, at, source.length, forward);
      result.push(...source.slice(at, at + run));
      at += run;
    }
    if (!(at < source.length || add.length > 0 || remove.length > 0)) {
      return result;
    }
  }
  throw new Error("the game would loop forever");
}

// each point's list, as LevelUpdate gets it walking the whole path from its first point (forward) or its last
export function slstWalk(items: Buffer[], forward = true): number[][] {
  const last = items.length - 1;
  if (forward) {
    const lists = [slstDecode(items[0], [], true)];
    for (let k = 1; k < last; k++) {
      lists.push(slstDecode(items[k], lists[lists.length - 1], true));
    }
    return lists;
  }
  const lists = [slstDecode(items[last], [], false)];
  for (let k = last - 1; k > 0; k--) {
    lists.unshift(slstDecode(items[k], lists[0], false));
  }
  return lists;
}
