#include "utest.h"
#include "pc/cardicon.h"

#define PAGE_SIZE 0x10000

/* a page is big, so not on the stack */
static uint8_t page[PAGE_SIZE];

/* a sprite's texinfo with its frame in segment 1, 3 along and 5 down, and its palette at clut 2, 7 */
static texinfo2 SomeTexinfo(void) {
  texinfo2 info;

  memset(&info, 0, sizeof(info));
  info.segment = 1;
  info.offs_x = 3;
  info.offs_y = 5;
  info.clut_x = 2;
  info.clut_y = 7;
  return info;
}

static void FreshPage(void) {
  memset(page, 0xee, sizeof(page));
}

UTEST(cardicon, a_frame_is_at_its_segment_and_offsets_4_bytes_along_and_4_rows_down_each) {
  texinfo2 info;

  info = SomeTexinfo();
  ASSERT_EQ((5 * 4) * CARD_ICON_PAGE_PITCH + (32 + 3) * 4, CardIconFrameAt(&info));
}

UTEST(cardicon, a_palette_is_at_its_clut_32_bytes_along_and_a_row_down_each) {
  texinfo2 info;

  info = SomeTexinfo();
  ASSERT_EQ(7 * CARD_ICON_PAGE_PITCH + 2 * 32, CardIconPaletteAt(&info));
}

UTEST(cardicon, a_frame_put_in_a_page_is_8_bytes_on_each_of_16_rows) {
  texinfo2 info;
  uint8_t frame[CARD_ICON_FRAME_SIZE];
  int row, byte, at;

  FreshPage();
  info = SomeTexinfo();
  for (byte=0;byte<CARD_ICON_FRAME_SIZE;byte++)
    frame[byte] = (uint8_t)byte;
  CardIconFrameToPage(page, &info, frame);
  at = CardIconFrameAt(&info);
  for (row=0;row<CARD_ICON_FRAME_ROWS;row++) {
    for (byte=0;byte<CARD_ICON_FRAME_ROW_SIZE;byte++)
      ASSERT_EQ(row * 8 + byte, page[at + row * CARD_ICON_PAGE_PITCH + byte]);
    ASSERT_EQ(0xee, page[at + row * CARD_ICON_PAGE_PITCH + CARD_ICON_FRAME_ROW_SIZE]); /* the next sprite's */
  }
}

UTEST(cardicon, a_frame_put_in_a_page_reads_back_the_same) {
  texinfo2 info;
  uint8_t frame[CARD_ICON_FRAME_SIZE], got[CARD_ICON_FRAME_SIZE];
  int byte;

  FreshPage();
  info = SomeTexinfo();
  for (byte=0;byte<CARD_ICON_FRAME_SIZE;byte++)
    frame[byte] = (uint8_t)(255 - byte);
  CardIconFrameToPage(page, &info, frame);
  CardIconFrameFromPage(page, &info, got);
  ASSERT_EQ(0, memcmp(frame, got, sizeof(frame)));
}

UTEST(cardicon, a_palette_put_in_a_page_is_16_colours_low_byte_first) {
  texinfo2 info;
  uint16_t palette[CARD_ICON_COLOURS];
  int at, i;

  FreshPage();
  info = SomeTexinfo();
  for (i=0;i<CARD_ICON_COLOURS;i++)
    palette[i] = 0x8000 | (i * 0x421);
  CardIconPaletteToPage(page, &info, palette);
  at = CardIconPaletteAt(&info);
  ASSERT_EQ(0x21, page[at + 2]);
  ASSERT_EQ(0x84, page[at + 3]);
  ASSERT_EQ(0xee, page[at + CARD_ICON_COLOURS * 2]); /* the next palette's */
}

UTEST(cardicon, a_palette_put_in_a_page_reads_back_the_same) {
  texinfo2 info;
  uint16_t palette[CARD_ICON_COLOURS], got[CARD_ICON_COLOURS];
  int i;

  FreshPage();
  info = SomeTexinfo();
  for (i=0;i<CARD_ICON_COLOURS;i++)
    palette[i] = (uint16_t)(0x7fff - i * 0x1111);
  CardIconPaletteToPage(page, &info, palette);
  CardIconPaletteFromPage(page, &info, got);
  ASSERT_EQ(0, memcmp(palette, got, sizeof(palette)));
}
