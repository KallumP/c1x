#include <stdio.h>
#include <string.h>
#include "test_disc.h"

#define RAW_SECTOR 2352

static void PutUint32(unsigned char *at, unsigned int value) {
  at[0] = value & 0xff;
  at[1] = (value >> 8) & 0xff;
  at[2] = (value >> 16) & 0xff;
  at[3] = (value >> 24) & 0xff;
}

/* an ISO9660 directory record at at; returns its length */
static int PutRecord(unsigned char *at, const char *name, int name_length,
  unsigned int lba, unsigned int size, int is_folder) {
  int length = 33 + name_length + (name_length % 2 == 0);

  memset(at, 0, length);
  at[0] = length;
  PutUint32(at + 2, lba);
  PutUint32(at + 10, size);
  if (is_folder) { at[25] = 2; }
  at[32] = name_length;
  memcpy(at + 33, name, name_length);
  return length;
}

static int PutNamedRecord(unsigned char *at, const char *name, unsigned int lba,
  unsigned int size, int is_folder) {
  return PutRecord(at, name, strlen(name), lba, size, is_folder);
}

/* a folder's . and .. records */
static int PutDotRecords(unsigned char *at, unsigned int lba) {
  int length = PutRecord(at, "\0", 1, lba, TEST_DISC_SECTOR, 1);

  return length + PutRecord(at + length, "\1", 1, lba, TEST_DISC_SECTOR, 1);
}

static void PutVolumeDescriptor(unsigned char *sector) {
  sector[0] = 1;
  memcpy(sector + 1, "CD001", 5);
  PutRecord(sector + 156, "\0", 1, 17, TEST_DISC_SECTOR, 1);
}

static void PutRootFolder(unsigned char *sector, int with_s0) {
  int at;

  memset(sector, 0, TEST_DISC_SECTOR);
  at = PutDotRecords(sector, 17);
  if (with_s0) { at += PutNamedRecord(sector + at, "S0", 18, TEST_DISC_SECTOR, 1); }
  PutNamedRecord(sector + at, "S9", 19, TEST_DISC_SECTOR, 1);
}

static void PutS0Folder(unsigned char *sector) {
  int at = PutDotRecords(sector, 18);

  at += PutNamedRecord(sector + at, "S0000009.NSD;1", 20, 5, 0);
  at += PutNamedRecord(sector + at, "S0000009.NSF;1", 21, TEST_DISC_SECTOR + 3, 0);
  PutNamedRecord(sector + at, "README.TXT;1", 23, 2, 0);
}

void MakeTestDisc(test_disc *disc) {
  memset(disc, 0, sizeof(*disc));
  disc->count = TEST_DISC_SECTORS;
  PutVolumeDescriptor(disc->sectors[16]);
  PutRootFolder(disc->sectors[17], 1);
  PutS0Folder(disc->sectors[18]);
  PutDotRecords(disc->sectors[19], 19);
  memcpy(disc->sectors[20], "nsd!!", 5);
  memset(disc->sectors[21], 0xaa, TEST_DISC_SECTOR);
  memset(disc->sectors[22], 0xbb, 3);
}

void RemoveStreamFolder(test_disc *disc) {
  PutRootFolder(disc->sectors[17], 0);
}

void WriteTestIso(const test_disc *disc, const char *path) {
  FILE *file = fopen(path, "wb");

  fwrite(disc->sectors, TEST_DISC_SECTOR, disc->count, file);
  fclose(file);
}

/* raw sectors: a sync pattern, a header saying mode 2, then the user data at 24 */
void WriteTestBin(const test_disc *disc, const char *path) {
  static unsigned char raw[RAW_SECTOR];
  FILE *file = fopen(path, "wb");
  int sector;

  for (sector = 0; sector < disc->count; sector++) {
    memset(raw, 0, sizeof(raw));
    memset(raw + 1, 0xff, 10);
    raw[15] = 2;
    memcpy(raw + 24, disc->sectors[sector], TEST_DISC_SECTOR);
    fwrite(raw, RAW_SECTOR, 1, file);
  }
  fclose(file);
}
