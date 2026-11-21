/*
 * a save's icon in a texture page (pc). see cardicon.h
 */
#include "cardicon.h"

int CardIconFrameAt(const texinfo2 *info) {
  return 0;
}

int CardIconPaletteAt(const texinfo2 *info) {
  return 0;
}

void CardIconFrameToPage(uint8_t *page, const texinfo2 *info, const uint8_t *frame) {
}

void CardIconFrameFromPage(const uint8_t *page, const texinfo2 *info, uint8_t *frame) {
}

void CardIconPaletteToPage(uint8_t *page, const texinfo2 *info, const uint16_t *palette) {
}

void CardIconPaletteFromPage(const uint8_t *page, const texinfo2 *info, uint16_t *palette) {
}
