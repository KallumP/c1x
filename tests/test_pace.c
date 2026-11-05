#include "utest.h"
#include "pc/pace.h"

UTEST(pace, a_frame_is_two_vblanks_long) {
  ASSERT_EQ(34, FrameTicks(LID_TITLE, 0));
  ASSERT_EQ(34, FrameTicks(LID_TITLE, 1));
  ASSERT_EQ(34, FrameTicks(LID_TEST, 7));
}

UTEST(pace, the_intro_draws_a_frame_every_two_and_three_vblanks_in_turn) {
  ASSERT_EQ(34, FrameTicks(LID_INTRO, 0));
  ASSERT_EQ(51, FrameTicks(LID_INTRO, 1));
  ASSERT_EQ(34, FrameTicks(LID_INTRO, 2));
  ASSERT_EQ(51, FrameTicks(LID_INTRO, 3));
}

UTEST(pace, so_the_intro_runs_at_four_fifths_of_full_speed) {
  int32_t ticks;
  int frame;

  ticks = 0;
  for (frame = 0; frame < 100; frame++)
    ticks += FrameTicks(LID_INTRO, frame);
  ASSERT_EQ(100 * 34 * 5 / 4, ticks); /* 36 s of the scene takes 45 s */
}
