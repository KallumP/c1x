#include <stdio.h>
#include <string.h>
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

int CardFileWrite(const char *dir, const char *file_name, const card_save *save, int percent) {
  return 0;
}

int CardFileRead(const char *dir, const char *file_name, card_save *save, char *slot_name, int size) {
  return 0;
}

int CardListFiles(const char *dir, char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE]) {
  return 0;
}

void CardNextFileName(char *file_name, const char *last_file_name, uint32_t save_id) {
  file_name[0] = 0;
}

int CardDeleteFiles(const char *dir) {
  return 0;
}
