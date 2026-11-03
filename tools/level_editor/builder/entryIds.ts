// entry ids (eids): a 5 character name, 6 bits a character, shifted up past a
// low bit that's always set. they reach past 2^31, so they're worked out with
// arithmetic rather than javascript's signed bit operators

export const EID_NONE = 0x6396347f;

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!";

// an entry id as its 5 character name, as NSEIDToString does
export function eidToString(eid: number): string {
  if ((eid & 1) === 0) {
    return `[${eid.toString(16).toUpperCase()}]`;
  }
  let rest = eid >>> 1;
  let name = "";
  for (let character = 0; character < 5; character++) {
    name = ALPHABET[rest & 0x3f] + name;
    rest >>>= 6;
  }
  return name;
}

// the entry id for a 5 character name
export function stringToEid(name: string): number {
  let value = 0;
  for (const character of name) {
    value = value * 64 + ALPHABET.indexOf(character);
  }
  return value * 2 + 1;
}

// the page table bucket an entry id is in
export const eidBucket = (eid: number) => (eid >>> 15) & 0xff;
