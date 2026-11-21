#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <sys/stat.h>
#include "card.h"

#define CHECKSUM_SEED 0x12345678 /* the ps1 game's */

/* a slot's info, as the game's screens read it (card_partinfos) */
#define SLOT_READ          1       /* it's been read */
#define SLOT_ICONS_SHIFT   1       /* how many icons it has, from this bit */
#define SLOT_ICON_COUNT    3
#define SLOT_IS_CRASH      8       /* a crash save, with its progress read */
#define SLOT_PROGRESS_SHIFT 5      /* its progress, from this bit */
#define SLOT_NOT_DAMAGED   0x20000

/* each byte added, then the sum turned 3 bits round, so where a byte is counts */
uint32_t CardChecksum(const uint8_t *buf, int len) {
  uint32_t checksum;
  int i;

  checksum = CHECKSUM_SEED;
  for (i=0;i<len;i++) {
    checksum += buf[i];
    checksum = (checksum << 3) | (checksum >> 29);
  }
  return checksum;
}

/* a save's checksum: of its block with the checksum 0 */
static uint32_t SaveChecksum(const card_save *save) {
  card_save copy;

  copy = *save;
  copy.checksum = 0;
  return CardChecksum((const uint8_t*)&copy, sizeof(copy));
}

/* gives a save its checksum, once the rest of it is filled in */
void CardSaveSeal(card_save *save) {
  save->checksum = SaveChecksum(save);
}

/* whether a save read back is as it was sealed */
int CardSaveIsValid(const card_save *save) {
  return save->checksum == SaveChecksum(save);
}

/* how far a save is, as the game's screens show it */
uint32_t CardProgress(int key_count, int gem_count, int level_count) {
  return ((uint32_t)key_count << 10) | ((uint32_t)gem_count << 5) | (uint32_t)level_count;
}

/* the info of a slot holding a crash save with progress */
uint32_t CardSlotInfo(uint32_t progress) {
  return SLOT_NOT_DAMAGED | (progress << SLOT_PROGRESS_SHIFT) | SLOT_IS_CRASH
    | (SLOT_ICON_COUNT << SLOT_ICONS_SHIFT) | SLOT_READ;
}

/* a slot's name on the game's screens: the ps1 game shows its saves' names in capitals */
void CardSlotName(char *name, int size, int percent) {
  snprintf(name, size, "CRASH (%d%%)", percent);
}

/* save files */

#define FILE_PREFIX      "BASCUS-94900" /* the ps1 game's saves' names start with its product code */
#define FILE_PREFIX_SIZE 12
#define FILE_COUNT_MAX   99             /* a save's count is two digits */
#define FILE_ID_RANGE    1000000        /* and its id six */
#define PATH_SIZE        512
#define HEADER_NAME_AT   4              /* a save's name in its header block, after "SC", its icon count and block count */
#define HEADER_ICONS     0x13           /* three icons */

static int IsSaveFileName(const char *file_name) {
  return strncmp(file_name, FILE_PREFIX, FILE_PREFIX_SIZE) == 0 && strlen(file_name) < CARD_FILE_NAME_SIZE;
}

static void FilePath(char *path, const char *dir, const char *file_name) {
  snprintf(path, PATH_SIZE, "%s/%s", dir, file_name);
}

static void MakeDir(const char *dir) {
#ifdef _WIN32
  mkdir(dir);
#else
  mkdir(dir, 0777);
#endif
}

/* a save's header block: the ps1's "SC", then its name */
static void FillHeader(uint8_t *header, int percent) {
  memset(header, 0, CARD_BLOCK_SIZE);
  header[0] = 'S';
  header[1] = 'C';
  header[2] = HEADER_ICONS;
  header[3] = 1;
  snprintf((char*)header + HEADER_NAME_AT, CARD_SLOT_NAME_SIZE, "Crash (%d%%)", percent);
}

/* writes save to file_name in dir (made if it isn't there) as percent done; whether it was written */
int CardFileWrite(const char *dir, const char *file_name, const card_save *save, int percent) {
  uint8_t blocks[CARD_FILE_BLOCKS][CARD_BLOCK_SIZE];
  char path[PATH_SIZE];
  FILE *file;
  size_t written;
  int i;

  memset(blocks, 0, sizeof(blocks));
  FillHeader(blocks[0], percent);
  for (i=CARD_FILE_BLOCKS-CARD_SAVE_COPIES;i<CARD_FILE_BLOCKS;i++)
    memcpy(blocks[i], save, CARD_BLOCK_SIZE);
  MakeDir(dir);
  FilePath(path, dir, file_name);
  file = fopen(path, "wb");
  if (!file) { return 0; }
  written = fwrite(blocks, 1, sizeof(blocks), file);
  fclose(file);
  return written == sizeof(blocks);
}

/* a save's name from its header block, in capitals as the game's screens show it */
static void SlotNameOf(const uint8_t *header, char *slot_name, int size) {
  int i;

  snprintf(slot_name, size, "%.*s", CARD_SLOT_NAME_SIZE-1, (const char*)header + HEADER_NAME_AT);
  for (i=0;slot_name[i];i++) {
    if (slot_name[i] >= 'a' && slot_name[i] <= 'z')
      slot_name[i] -= 'a' - 'A';
  }
}

/* reads file_name in dir: its first copy of the save that's valid, and its slot name; whether one was */
int CardFileRead(const char *dir, const char *file_name, card_save *save, char *slot_name, int size) {
  uint8_t blocks[CARD_FILE_BLOCKS][CARD_BLOCK_SIZE];
  char path[PATH_SIZE];
  FILE *file;
  size_t read;
  int i;

  FilePath(path, dir, file_name);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  read = fread(blocks, 1, sizeof(blocks), file);
  fclose(file);
  if (read != sizeof(blocks) || blocks[0][0] != 'S' || blocks[0][1] != 'C') { return 0; }
  SlotNameOf(blocks[0], slot_name, size);
  for (i=CARD_FILE_BLOCKS-CARD_SAVE_COPIES;i<CARD_FILE_BLOCKS;i++) {
    memcpy(save, blocks[i], CARD_BLOCK_SIZE);
    if (CardSaveIsValid(save)) { return 1; }
  }
  return 0;
}

static int CompareFileNames(const void *a, const void *b) {
  return strcmp((const char*)a, (const char*)b);
}

/* every save file's name in dir, in order */
static int ListAllFiles(const char *dir, char (**file_names)[CARD_FILE_NAME_SIZE]) {
  DIR *folder;
  struct dirent *item;
  char (*names)[CARD_FILE_NAME_SIZE];
  int count;

  *file_names = 0;
  folder = opendir(dir);
  if (!folder) { return 0; }
  names = 0;
  count = 0;
  while ((item = readdir(folder))) {
    if (!IsSaveFileName(item->d_name)) { continue; }
    names = realloc(names, (count+1)*sizeof(*names));
    strcpy(names[count++], item->d_name);
  }
  closedir(folder);
  if (count)
    qsort(names, count, sizeof(*names), CompareFileNames);
  *file_names = names;
  return count;
}

/* the names of the saves in dir, in order, up to as many as a card holds; how many */
int CardListFiles(const char *dir, char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE]) {
  char (*names)[CARD_FILE_NAME_SIZE];
  int count;

  count = ListAllFiles(dir, &names);
  if (count > CARD_SLOT_MAX)
    count = CARD_SLOT_MAX;
  if (count)
    memcpy(file_names, names, count*sizeof(*names));
  free(names);
  return count;
}

/* a new save's name: numbered one on from the card's last save's (0 without one), with its id */
void CardNextFileName(char *file_name, const char *last_file_name, uint32_t save_id) {
  int count;

  count = 0;
  if (last_file_name && IsSaveFileName(last_file_name) && strlen(last_file_name) >= FILE_PREFIX_SIZE+2)
    count = (last_file_name[FILE_PREFIX_SIZE]-'0')*10 + (last_file_name[FILE_PREFIX_SIZE+1]-'0') + 1;
  if (count > FILE_COUNT_MAX)
    count = FILE_COUNT_MAX;
  snprintf(file_name, CARD_FILE_NAME_SIZE, "%s%02d%06u", FILE_PREFIX, count, (unsigned)(save_id % FILE_ID_RANGE));
}

/* deletes every save in dir, as formatting a card does; how many */
int CardDeleteFiles(const char *dir) {
  char (*names)[CARD_FILE_NAME_SIZE];
  char path[PATH_SIZE];
  int i, count;

  count = ListAllFiles(dir, &names);
  for (i=0;i<count;i++) {
    FilePath(path, dir, names[i]);
    remove(path);
  }
  free(names);
  return count;
}

void CardReset(card *c, const char *dir, int new_device) {
  memset(c, 0, sizeof(*c));
  c->dir = dir;
}

void CardStep(card *c, const card_game *game) {
}

int CardRequest(card *c, int op, int slot_idx) {
  return 0;
}
