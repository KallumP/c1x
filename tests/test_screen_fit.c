#include "utest.h"
#include "pc/screen_fit.h"

/* the area FitPicture gives for a window w by h */
static screen_area FitFor(int w, int h) {
  screen_area area;

  FitPicture(w, h, &area);
  return area;
}

UTEST(screen_fit, a_4_by_3_window_is_filled) {
  screen_area area = FitFor(1024, 768);

  ASSERT_EQ(0, area.x);
  ASSERT_EQ(0, area.y);
  ASSERT_EQ(1024, area.w);
  ASSERT_EQ(768, area.h);
}

UTEST(screen_fit, a_wide_screen_has_bars_at_the_sides) {
  screen_area area = FitFor(1920, 1080);

  ASSERT_EQ(240, area.x);
  ASSERT_EQ(0, area.y);
  ASSERT_EQ(1440, area.w);
  ASSERT_EQ(1080, area.h);
}

UTEST(screen_fit, a_tall_window_has_bars_at_the_top_and_bottom) {
  screen_area area = FitFor(800, 1000);

  ASSERT_EQ(0, area.x);
  ASSERT_EQ(200, area.y);
  ASSERT_EQ(800, area.w);
  ASSERT_EQ(600, area.h);
}

UTEST(screen_fit, a_minimised_window_has_no_area) {
  screen_area area = FitFor(0, 0);

  ASSERT_EQ(0, area.w);
  ASSERT_EQ(0, area.h);
}
