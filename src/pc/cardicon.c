/*
 * a save's icon in a texture page (pc). see cardicon.h
 */
#include "cardicon.h"

#define FRAME_UNIT_BYTES 4 /* a texinfo's segment and x offset count 2 words along ... */
#define FRAME_UNIT_ROWS  4 /* ... and its y offset 4 rows down */
#define PALETTE_SIZE     (CARD_ICON_COLOURS * 2)
#define SEGMENT_UNITS    32

/* a frame's first byte in the page */
int CardIconFrameAt(const texinfo2 *info) {
  int x, y;

  x = ((info->segment * SEGMENT_UNITS) + info->offs_x) * FRAME_UNIT_BYTES;
  y = info->offs_y * FRAME_UNIT_ROWS;
  return y * CARD_ICON_PAGE_PITCH + x;
}

/* a palette's first byte in the page: its clut x counts palettes along, its clut y rows down */
int CardIconPaletteAt(const texinfo2 *info) {
  return info->clut_y * CARD_ICON_PAGE_PITCH + info->clut_x * PALETTE_SIZE;
}

/* a frame's rows between a page (a row a page row) and a frame (rows one after another) */
static void CopyFrameRows(uint8_t *dst, int dst_pitch, const uint8_t *src, int src_pitch) {
  int row;

  for (row=0;row<CARD_ICON_FRAME_ROWS;row++)
    memcpy(dst + row * dst_pitch, src + row * src_pitch, CARD_ICON_FRAME_ROW_SIZE);
}

void CardIconFrameToPage(uint8_t *page, const texinfo2 *info, const uint8_t *frame) {
  CopyFrameRows(page + CardIconFrameAt(info), CARD_ICON_PAGE_PITCH, frame, CARD_ICON_FRAME_ROW_SIZE);
}

void CardIconFrameFromPage(const uint8_t *page, const texinfo2 *info, uint8_t *frame) {
  CopyFrameRows(frame, CARD_ICON_FRAME_ROW_SIZE, page + CardIconFrameAt(info), CARD_ICON_PAGE_PITCH);
}

/* a page keeps a colour low byte first, as the ps1's vram did */
void CardIconPaletteToPage(uint8_t *page, const texinfo2 *info, const uint16_t *palette) {
  uint8_t *at;
  int i;

  at = page + CardIconPaletteAt(info);
  for (i=0;i<CARD_ICON_COLOURS;i++) {
    at[i*2] = palette[i] & 0xFF;
    at[i*2+1] = palette[i] >> 8;
  }
}

void CardIconPaletteFromPage(const uint8_t *page, const texinfo2 *info, uint16_t *palette) {
  const uint8_t *at;
  int i;

  at = page + CardIconPaletteAt(info);
  for (i=0;i<CARD_ICON_COLOURS;i++)
    palette[i] = at[i*2] | (at[i*2+1] << 8);
}
