#include "utest.h"
#include "pc/slash.h"

static uint8_t image[SLASH_WIDTH * SLASH_HEIGHT * 4];

/* the pixel at x, y: its red, green, blue and alpha */
static uint8_t *Pixel(int x, int y) {
  return &image[((y * SLASH_WIDTH) + x) * 4];
}

UTEST(slash, the_middle_of_the_stroke_is_drawn) {
  SlashImage(image);
  ASSERT_EQ(255, Pixel(SLASH_WIDTH / 2, SLASH_HEIGHT / 2)[3]);
}

UTEST(slash, the_corners_away_from_the_stroke_are_clear) {
  SlashImage(image);
  ASSERT_EQ(0, Pixel(0, 0)[3]);
  ASSERT_EQ(0, Pixel(SLASH_WIDTH - 1, SLASH_HEIGHT - 1)[3]);
}

UTEST(slash, it_leans_right_like_a_slash) {
  SlashImage(image);
  ASSERT_EQ(255, Pixel(SLASH_WIDTH * 3 / 4, SLASH_HEIGHT / 8)[3]);
  ASSERT_EQ(0, Pixel(SLASH_WIDTH / 4, SLASH_HEIGHT / 8)[3]);
}

UTEST(slash, it_goes_from_orange_at_the_top_to_red_at_the_bottom_like_the_digits) {
  uint8_t *top, *bottom;

  SlashImage(image);
  top = Pixel(SLASH_WIDTH * 2 / 3, SLASH_HEIGHT / 4);
  bottom = Pixel(SLASH_WIDTH / 3, SLASH_HEIGHT * 3 / 4);
  ASSERT_EQ(255, top[3]);
  ASSERT_EQ(255, bottom[3]);
  ASSERT_GT(top[1], bottom[1]); /* more green: more orange */
}

UTEST(slash, it_stays_full_red_top_to_bottom_like_the_digits) {
  SlashImage(image);
  ASSERT_EQ(255, Pixel(SLASH_WIDTH * 2 / 3, SLASH_HEIGHT / 4)[0]);
  ASSERT_EQ(255, Pixel(SLASH_WIDTH / 3, SLASH_HEIGHT * 3 / 4)[0]);
}

UTEST(slash, its_top_is_the_digits_orange_not_yellow) {
  SlashImage(image);
  ASSERT_LE(Pixel(SLASH_WIDTH * 3 / 4, SLASH_HEIGHT / 8)[1], 120);
}

UTEST(slash, the_stroke_has_a_black_outline) {
  int x, y;

  SlashImage(image);
  /* along the middle row, from the left: clear, then outline, then the stroke */
  y = SLASH_HEIGHT / 2;
  for (x = 0; Pixel(x, y)[3] == 0; x++);
  ASSERT_EQ(0, Pixel(x, y)[0]);
  ASSERT_EQ(0, Pixel(x, y)[1]);
  ASSERT_EQ(0, Pixel(x, y)[2]);
}
