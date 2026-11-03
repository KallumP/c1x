// extracting the game's asset files from a disc image of your own copy of crash
// bandicoot: reads the ISO9660 filesystem of a .bin (raw 2352 byte sectors) or
// .iso (2048 byte sectors) image, and copies every .NSD and .NSF file in the
// S0-S3 folders into the streams folder, named in lower case
import { closeSync, mkdirSync, openSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SECTOR_DATA = 2048;
const RAW_SECTOR = 2352;
const SYNC = Buffer.from([0x00, ...Array(10).fill(0xff), 0x00]); // raw sectors start with this
const VOLUME_DESCRIPTOR = 16;  // the primary volume descriptor's sector
const STREAM_FOLDERS = ["S0", "S1", "S2", "S3"];

interface DirectoryEntry {
  name: string;
  lba: number;
  size: number;
  isFolder: boolean;
}

// a disc image's sectors' user data
class DiscImage {
  private file: number;
  private sectorSize = SECTOR_DATA;
  private dataOffset = 0;

  constructor(private path: string) {
    this.file = openSync(path, "r");
    const header = this.readAt(VOLUME_DESCRIPTOR * RAW_SECTOR, 16);
    if (header.subarray(0, 12).equals(SYNC)) {
      this.sectorSize = RAW_SECTOR;
      this.dataOffset = header[15] === 1 ? 16 : 24; // mode 1 user data starts at byte 16 of a raw sector, mode 2 form 1 at 24
    }
  }

  private readAt(position: number, length: number): Buffer {
    const data = Buffer.alloc(length);
    const read = readSync(this.file, data, 0, length, position);
    return data.subarray(0, read);
  }

  // length bytes from sector lba on
  read(lba: number, length: number): Buffer {
    const chunks: Buffer[] = [];
    let total = 0;
    for (let sector = lba; total < length; sector++) {
      const chunk = this.readAt(sector * this.sectorSize + this.dataOffset, SECTOR_DATA);
      if (chunk.length === 0) {
        throw new Error(`${this.path} ends early; is it a complete disc image?`);
      }
      chunks.push(chunk);
      total += chunk.length;
    }
    return Buffer.concat(chunks).subarray(0, length);
  }

  close(): void {
    closeSync(this.file);
  }
}

function readRecord(record: Buffer): DirectoryEntry {
  const name = record.subarray(33, 33 + record[32]).toString("ascii").split(";")[0];
  return { name, lba: record.readUInt32LE(2), size: record.readUInt32LE(10), isFolder: (record[25] & 2) !== 0 };
}

const isSelfOrParent = (record: Buffer) => record[32] === 1 && (record[33] === 0 || record[33] === 1);

// the entries of the folder at lba, size bytes long, without . and ..
function folderEntries(disc: DiscImage, lba: number, size: number): DirectoryEntry[] {
  const data = disc.read(lba, size);
  const entries: DirectoryEntry[] = [];
  for (let at = 0; at < data.length;) {
    const length = data[at];
    if (length === 0) { // records don't cross sector boundaries; on to the next sector
      at = (Math.floor(at / SECTOR_DATA) + 1) * SECTOR_DATA;
      continue;
    }
    const record = data.subarray(at, at + length);
    if (!isSelfOrParent(record)) {
      entries.push(readRecord(record));
    }
    at += length;
  }
  return entries;
}

function rootFolder(disc: DiscImage, imagePath: string): DirectoryEntry {
  const descriptor = disc.read(VOLUME_DESCRIPTOR, SECTOR_DATA);
  if (descriptor.subarray(1, 6).toString("ascii") !== "CD001") {
    throw new Error(`${imagePath} is not a recognised disc image (no ISO9660 volume found)`);
  }
  return readRecord(descriptor.subarray(156, 156 + 34));
}

const isStreamFile = ({ name, isFolder }: DirectoryEntry) => !isFolder && /\.NS[DF]$/i.test(name);

// copies the game's files from the disc image into outDir; how many
export function extractStreams(imagePath: string, outDir: string): number {
  const disc = new DiscImage(imagePath);
  try {
    const root = rootFolder(disc, imagePath);
    mkdirSync(outDir, { recursive: true });
    let count = 0;
    const streamFolders = folderEntries(disc, root.lba, root.size).filter(({ name, isFolder }) => isFolder && STREAM_FOLDERS.includes(name));
    for (const folder of streamFolders) {
      for (const file of folderEntries(disc, folder.lba, folder.size).filter(isStreamFile)) {
        writeFileSync(join(outDir, file.name.toLowerCase()), disc.read(file.lba, file.size));
        count++;
      }
    }
    if (count === 0) {
      throw new Error("no .NSD/.NSF files found in S0-S3; is this a Crash Bandicoot disc?");
    }
    return count;
  } finally {
    disc.close();
  }
}
