// cutting a real level down to the entries a custom level needs, and packing
// entries into pages
import { readWords } from "./bytes";
import { EID_NONE, eidBucket, eidToString } from "./entryIds";
import { entriesById, entryPage, PAGE_ENTRIES, PAGE_SIZE, PAGE_TEXTURE, type Entry, type Level, type Nsd, type Page } from "./levelFiles";
import { entryBytes } from "./levelWriting";

// exec map slots CoreObjectsCreate opens for every normal level: crash, fruit,
// hud, DoctC, shadow and boxes (src/main.c)
export const CORE_EXEC_SLOTS = [0, 3, 4, 5, 29, 34];

// the eids (of those given) that entry's items mention: any aligned word that
// equals one counts, which may keep something unneeded but never drops something needed
export function references(entry: Entry, eids: Set<number>): Set<number> {
  const found = new Set<number>();
  for (const item of entry.items) {
    readWords(item, 0, Math.floor(item.length / 4)).filter((word) => eids.has(word)).forEach((word) => found.add(word));
  }
  return found;
}

const pageHeaderSize = (entryCount: number) => 16 + 4 * (entryCount + 1);

// an entry too big for a page even on its own
export class EntryTooBig extends Error {
  constructor(public entry: Entry, size: number) {
    super(`${eidToString(entry.eid)} takes ${size} bytes, more than a page`);
  }
}

// pages (entry pages, or as makePage makes them) holding entries, in order, starting a new page when one is full.
// each page lists its entries in bucket order, since the loader
// (NSPageUpdateEntries) finds them by scanning the page table forward from the
// bucket of the page's first entry
export function packEntries(entries: Entry[], makePage: (entries: Entry[]) => Page = entryPage): Page[] {
  const pages: Entry[][] = [];
  let current: Entry[] = [];
  let currentBytes = 0;
  for (const entry of entries) {
    const size = entryBytes(entry).length;
    if (pageHeaderSize(1) + size > PAGE_SIZE) {
      throw new EntryTooBig(entry, pageHeaderSize(1) + size);
    }
    if (current.length && pageHeaderSize(current.length + 1) + currentBytes + size > PAGE_SIZE) {
      pages.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(entry);
    currentBytes += size;
  }
  if (current.length) {
    pages.push(current);
  }
  return pages.map((page) => makePage([...page].sort((first, second) => eidBucket(first.eid) - eidBucket(second.eid))));
}

// the pages that aren't entry pages (texture and audio), by the eids in them
export function rawPagesById(level: Level): Map<number, Page> {
  const pages = new Map<number, Page>();
  for (const page of level.pages) {
    if (page.type === PAGE_TEXTURE) {
      pages.set(page.eid, page);
    } else if (page.type !== PAGE_ENTRIES) {
      page.entries.forEach((entry) => pages.set(entry.eid, page));
    }
  }
  return pages;
}

// the eids reachable from keep, through the eids each entry mentions
export function reachableEids(level: Level, keep: number[]): Set<number> {
  const entries = entriesById(level);
  const allEids = new Set([...entries.keys(), ...rawPagesById(level).keys()]);
  const kept = new Set<number>();
  const toVisit = keep.filter((eid) => allEids.has(eid));
  while (toVisit.length) {
    const eid = toVisit.pop()!;
    if (kept.has(eid)) {
      continue;
    }
    kept.add(eid);
    const entry = entries.get(eid);
    if (entry) {
      references(entry, allEids).forEach((mentioned) => !kept.has(mentioned) && toVisit.push(mentioned));
    }
  }
  return kept;
}

function copyNsd(nsd: Nsd): Nsd {
  return {
    ...nsd,
    ptbOffsets: [...nsd.ptbOffsets],
    pageTable: nsd.pageTable.map(([pageId, eid]) => [pageId, eid]),
    ldat: { ...nsd.ldat, execMap: [...nsd.ldat.execMap] },
  };
}

// a copy of level with only the entries reachable from the eids in keep
// (texture and audio pages are kept whole if anything in them is used),
// repacked into as few pages as they fit
export function cutLevel(level: Level, keep: number[]): Level {
  const kept = reachableEids(level, keep);
  const isUsed = (page: Page) => (page.type === PAGE_TEXTURE ? kept.has(page.eid) : page.entries.some(({ eid }) => kept.has(eid)));
  const rawPages = level.pages.filter((page) => page.type !== PAGE_ENTRIES && isUsed(page));
  const keptEntries = level.pages.filter((page) => page.type === PAGE_ENTRIES)
    .flatMap((page) => page.entries.filter(({ eid }) => kept.has(eid)));
  const nsd = copyNsd(level.nsd);
  nsd.ldat.execMap = nsd.ldat.execMap.map((eid) => (kept.has(eid) ? eid : EID_NONE));
  return { nsd, pages: [...packEntries(keptEntries), ...rawPages] };
}
