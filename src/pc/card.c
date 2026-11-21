#include "card.h"

uint32_t CardChecksum(const uint8_t *buf, int len) {
  return 0;
}

void CardSaveSeal(card_save *save) {
}

int CardSaveIsValid(const card_save *save) {
  return 0;
}

uint32_t CardProgress(int key_count, int gem_count, int level_count) {
  return 0;
}

uint32_t CardSlotInfo(uint32_t progress) {
  return 0;
}

void CardSlotName(char *name, int size, int percent) {
  if (size > 0) { name[0] = 0; }
}
