#include "utest.h"
#include "pc/pace.h"

#define TICKS_A_SECOND (34000000.0 / 0x8000)

/* seconds from the first frame of lid to the start of frame */
static double SecondsToFrame(lid_t lid, uint32_t frame) {
  int32_t ticks;
  uint32_t i;

  ticks = 0;
  for (i = 0; i < frame; i++)
    ticks += FrameTicks(lid, i);
  return ticks / TICKS_A_SECOND;
}

UTEST(pace, a_frame_is_two_vblanks_long) {
  ASSERT_EQ(34, FrameTicks(LID_TITLE, 0));
  ASSERT_EQ(34, FrameTicks(LID_TITLE, 500));
  ASSERT_EQ(34, FrameTicks(LID_TEST, 7));
}

UTEST(pace, every_intro_frame_is_a_whole_number_of_vblanks) {
  uint32_t frame;
  int32_t ticks;

  for (frame = 0; frame < 1000; frame++) {
    ticks = FrameTicks(LID_INTRO, frame);
    ASSERT_EQ(0, ticks % VBLANK_TICKS);
    ASSERT_GE(ticks, FRAME_TICKS);
  }
}

UTEST(pace, the_intro_draws_a_frame_every_two_and_three_vblanks_in_turn) {
  ASSERT_EQ(34, FrameTicks(LID_INTRO, 0));
  ASSERT_EQ(51, FrameTicks(LID_INTRO, 1));
  ASSERT_EQ(34, FrameTicks(LID_INTRO, 1000));
  ASSERT_EQ(51, FrameTicks(LID_INTRO, 1001));
}

UTEST(pace, so_the_intro_takes_as_long_as_on_the_ps1) {
  /* its 1106 frames took 36 s at 30 fps, against 45 s in a recording of
     the PS1's intro */
  ASSERT_NEAR(45.0, SecondsToFrame(LID_INTRO, 1106), 0.5);
}
