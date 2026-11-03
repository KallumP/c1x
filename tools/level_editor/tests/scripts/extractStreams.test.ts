import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { extractStreams } from "../../scripts/extractStreams";

const SECTOR = 2048;

// an ISO9660 directory record for a file or folder at lba, size bytes long
function directoryRecord(name: string, lba: number, size: number, isFolder: boolean): Buffer {
  const nameBytes = Buffer.from(name, "ascii");
  const length = 33 + nameBytes.length + (nameBytes.length % 2 === 0 ? 1 : 0);
  const record = Buffer.alloc(length);
  record[0] = length;
  record.writeUInt32LE(lba, 2);
  record.writeUInt32LE(size, 10);
  record[25] = isFolder ? 2 : 0;
  record[32] = nameBytes.length;
  nameBytes.copy(record, 33);
  return record;
}

const sectorOf = (...records: Buffer[]) => Buffer.concat([...records, Buffer.alloc(SECTOR)]).subarray(0, SECTOR);
const dotRecords = (lba: number) => [directoryRecord("\0", lba, SECTOR, true), directoryRecord("\x01", lba, SECTOR, true)];

// the user data of a small disc: S0 holding an .NSD, an .NSF and a readme, and an empty S9
function discSectors(): Buffer[] {
  const sectors = Array.from({ length: 24 }, () => Buffer.alloc(SECTOR));
  const pvd = Buffer.alloc(SECTOR);
  pvd[0] = 1;
  pvd.write("CD001", 1, "ascii");
  directoryRecord("\0", 17, SECTOR, true).copy(pvd, 156);
  sectors[16] = pvd;
  sectors[17] = sectorOf(...dotRecords(17), directoryRecord("S0", 18, SECTOR, true), directoryRecord("S9", 19, SECTOR, true));
  sectors[18] = sectorOf(
    ...dotRecords(18),
    directoryRecord("S0000009.NSD;1", 20, 5, false),
    directoryRecord("S0000009.NSF;1", 21, SECTOR + 3, false),
    directoryRecord("README.TXT;1", 23, 2, false),
  );
  sectors[19] = sectorOf(...dotRecords(19));
  sectors[20] = sectorOf(Buffer.from("nsd!!"));
  sectors[21] = Buffer.alloc(SECTOR, 0xaa);
  sectors[22] = sectorOf(Buffer.from([0xbb, 0xbb, 0xbb]));
  return sectors;
}

// raw 2352 byte sectors: a sync pattern, a header saying mode 2, then the user data at 24
function rawSectors(sectors: Buffer[]): Buffer {
  return Buffer.concat(sectors.map((data) => {
    const raw = Buffer.alloc(2352);
    Buffer.from([0x00, ...Array(10).fill(0xff), 0x00]).copy(raw, 0);
    raw[15] = 2;
    data.copy(raw, 24);
    return raw;
  }));
}

const folder = () => mkdtempSync(join(tmpdir(), "disc-"));

function extracted(image: Buffer): { count: number; out: string } {
  const where = folder();
  const imagePath = join(where, "crash.bin");
  writeFileSync(imagePath, image);
  const out = join(where, "streams");
  return { count: extractStreams(imagePath, out), out };
}

describe("extracting the game's files from a disc image", () => {
  test("an .iso's S0-S3 .NSD and .NSF files, in lower case", () => {
    const { count, out } = extracted(Buffer.concat(discSectors()));
    expect(count).toBe(2);
    expect(readdirSync(out).sort()).toEqual(["s0000009.nsd", "s0000009.nsf"]);
    expect(readFileSync(join(out, "s0000009.nsd"), "latin1")).toBe("nsd!!");
    expect([...readFileSync(join(out, "s0000009.nsf"))]).toEqual([...Array(SECTOR).fill(0xaa), 0xbb, 0xbb, 0xbb]);
  });

  test("a raw .bin of 2352 byte sectors", () => {
    const { count, out } = extracted(rawSectors(discSectors()));
    expect(count).toBe(2);
    expect(readFileSync(join(out, "s0000009.nsd"), "latin1")).toBe("nsd!!");
  });

  test("something that isn't a disc image is an error", () => {
    expect(() => extracted(Buffer.alloc(40 * SECTOR))).toThrow(/not a recognised disc image/);
  });

  test("a disc image that ends early is an error", () => {
    expect(() => extracted(Buffer.concat(discSectors().slice(0, 21)))).toThrow(/ends early/);
  });

  test("a disc without the game's files is an error, and writes nothing", () => {
    const sectors = discSectors();
    sectors[17] = sectorOf(...dotRecords(17), directoryRecord("S9", 19, SECTOR, true));
    const where = folder();
    writeFileSync(join(where, "other.iso"), Buffer.concat(sectors));
    expect(() => extractStreams(join(where, "other.iso"), join(where, "streams"))).toThrow(/no \.NSD\/\.NSF files found/);
    expect(existsSync(join(where, "streams")) && readdirSync(join(where, "streams")).length).toBeFalsy();
  });
});
