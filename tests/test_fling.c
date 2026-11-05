#include "utest.h"
#include "pc/fling.h"

static vec at(int32_t x, int32_t y, int32_t z) {
  vec v;
  v.x = x; v.y = y; v.z = z;
  return v;
}

UTEST(fling, a_flung_enemy_breaks_boxes_near_where_it_stood_in_a_custom_level) {
  vec stood = at(1000 << 8, 0, 8000 << 8);
  vec near = at(1000 << 8, 300 << 8, (8000 - 1100) << 8); /* 1100 back, risen a little */

  ASSERT_TRUE(FlingBreaksBox(LID_TEST, &stood, &near));
}

UTEST(fling, a_flung_enemy_breaks_no_boxes_past_its_reach_in_a_custom_level) {
  vec stood = at(1000 << 8, 0, 8000 << 8);
  vec far = at(1000 << 8, 0, (8000 - 1300) << 8);
  vec far_aside = at((1000 + 1000) << 8, 0, (8000 - 1000) << 8); /* about 1414 away */

  ASSERT_FALSE(FlingBreaksBox(LID_TEST, &stood, &far));
  ASSERT_FALSE(FlingBreaksBox(LID_TEST, &stood, &far_aside));
}

UTEST(fling, its_reach_is_3_m_across_the_ground_at_scale_400) {
  vec stood = at(0, 0, 0);
  vec edge = at(0, 0, -FLING_REACH);
  vec high_over = at(0, 5000 << 8, 0); /* height doesn't count */

  ASSERT_EQ(1200 << 8, FLING_REACH);
  ASSERT_TRUE(FlingBreaksBox(LID_TEST, &stood, &edge));
  ASSERT_TRUE(FlingBreaksBox(LID_TEST, &stood, &high_over));
}

UTEST(fling, a_flung_enemy_breaks_every_box_it_hits_in_the_games_own_levels) {
  vec stood = at(0, 0, 0);
  vec far = at(0, 0, -100000 << 8);

  ASSERT_TRUE(FlingBreaksBox(LID_TEST - 1, &stood, &far));
  ASSERT_TRUE(FlingBreaksBox(LID_BOOTLEVEL, &stood, &far));
}
