/*
 * reading a disc image's ISO9660 file system, as the game's files are
 * extracted from it (see extract.c)
 */
#include <stdlib.h>
#include <string.h>
#include "disc_image.h"

#define SECTOR_DATA 2048
#define RAW_SECTOR 2352
#define VOLUME_DESCRIPTOR 16 /* the primary volume descriptor's sector */
#define ROOT_RECORD 156      /* the root folder's record in the descriptor */
#define FOLDER_FLAG 2

static const unsigned char raw_sync[12] = {
  0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00
};

static unsigned int ReadUint32(const unsigned char *at) {
  return at[0] | (at[1] << 8) | (at[2] << 16) | ((unsigned int)at[3] << 24);
}

/* raw sectors start with a sync pattern; mode 1's user data starts at byte
   16 of a sector, mode 2 form 1's at 24 */
static void DetectSectorLayout(disc_image *image) {
  unsigned char header[16];

  image->sector_size = SECTOR_DATA;
  image->data_offset = 0;
  if (fseek(image->file, (long)VOLUME_DESCRIPTOR * RAW_SECTOR, SEEK_SET) != 0) { return; }
  if (fread(header, 1, sizeof(header), image->file) != sizeof(header)) { return; }
  if (memcmp(header, raw_sync, sizeof(raw_sync)) != 0) { return; }
  image->sector_size = RAW_SECTOR;
  if (header[15] == 1) {
    image->data_offset = 16;
  } else {
    image->data_offset = 24;
  }
}

int OpenDiscImage(disc_image *image, const char *path) {
  image->file = fopen(path, "rb");
  if (!image->file) { return 0; }
  DetectSectorLayout(image);
  return 1;
}

void CloseDiscImage(disc_image *image) {
  if (image->file) { fclose(image->file); }
  image->file = 0;
}

static int ReadSectorData(disc_image *image, unsigned int lba, unsigned int length,
  unsigned char *out) {
  long at = (long)lba * image->sector_size + image->data_offset;

  if (fseek(image->file, at, SEEK_SET) != 0) { return 0; }
  return fread(out, 1, length, image->file) == length;
}

int ReadDiscData(disc_image *image, unsigned int lba, unsigned int length,
  unsigned char *out) {
  unsigned int done = 0;

  while (done < length) {
    unsigned int chunk = length - done;

    if (chunk > SECTOR_DATA) { chunk = SECTOR_DATA; }
    if (!ReadSectorData(image, lba, chunk, out + done)) { return 0; }
    done += chunk;
    lba++;
  }
  return 1;
}

static void ReadRecord(const unsigned char *record, disc_entry *entry) {
  int length = record[32];
  char *version;

  if (length >= DISC_NAME_MAX) { length = DISC_NAME_MAX - 1; }
  memcpy(entry->name, record + 33, length);
  entry->name[length] = 0;
  version = strchr(entry->name, ';');
  if (version) { *version = 0; }
  entry->lba = ReadUint32(record + 2);
  entry->size = ReadUint32(record + 10);
  entry->is_folder = (record[25] & FOLDER_FLAG) != 0;
}

int ReadRootFolder(disc_image *image, disc_entry *root) {
  unsigned char descriptor[SECTOR_DATA];

  if (!ReadDiscData(image, VOLUME_DESCRIPTOR, SECTOR_DATA, descriptor)) { return 0; }
  if (memcmp(descriptor + 1, "CD001", 5) != 0) { return 0; }
  ReadRecord(descriptor + ROOT_RECORD, root);
  return 1;
}

static int IsSelfOrParent(const unsigned char *record) {
  return record[32] == 1 && (record[33] == 0 || record[33] == 1);
}

/* records don't cross sector boundaries; a zero length means the rest of the
   sector is padding */
static unsigned int NextSectorStart(unsigned int at) {
  return (at / SECTOR_DATA + 1) * SECTOR_DATA;
}

static int ReadEntriesFrom(const unsigned char *data, unsigned int size,
  disc_entry *entries, int max) {
  unsigned int at = 0;
  int count = 0;

  while (at < size && count < max) {
    unsigned int length = data[at];

    if (length == 0) {
      at = NextSectorStart(at);
      continue;
    }
    if (at + length > size) { break; }
    if (!IsSelfOrParent(data + at)) { ReadRecord(data + at, &entries[count++]); }
    at += length;
  }
  return count;
}

int ReadFolderEntries(disc_image *image, const disc_entry *folder,
  disc_entry *entries, int max) {
  unsigned char *data = malloc(folder->size);
  int count = -1;

  if (!data) { return -1; }
  if (ReadDiscData(image, folder->lba, folder->size, data)) {
    count = ReadEntriesFrom(data, folder->size, entries, max);
  }
  free(data);
  return count;
}
