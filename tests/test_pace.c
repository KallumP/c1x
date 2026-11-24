#include "utest.h"
#include "pc/pace.h"
#include "pc/time.h"

#define TICKS_A_SECOND (TICKS_A_SECOND_UNITS / (double)0x8000)

/* seconds from the first frame of lid to the start of frame */
static double SecondsToFrame(lid_t lid, uint32_t frame) {
  int32_t ticks;
  uint32_t i;

  ticks = 0;
  for (i = 0; i < frame; i++)
    ticks += FrameTicks(lid, i);
  return ticks / TICKS_A_SECOND;
}

UTEST(pace, a_frame_lasts_34_or_35_ticks) {
  uint32_t frame;
  int32_t ticks;

  for (frame = 0; frame < 1000; frame++) {
    ticks = FrameTicks(LID_TEST, frame);
    ASSERT_TRUE(ticks == 34 || ticks == 35);
  }
}

/* two ntsc vblanks: 30000 frames every 1001 seconds (29.97 fps) */
UTEST(pace, frames_come_at_the_ps1s_29_97_a_second) {
  ASSERT_NEAR(1001.0, SecondsToFrame(LID_TEST, 30000), 0.01);
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
  ASSERT_EQ(2*VBLANK_TICKS, FrameTicks(LID_INTRO, 0));
  ASSERT_EQ(3*VBLANK_TICKS, FrameTicks(LID_INTRO, 1));
  ASSERT_EQ(2*VBLANK_TICKS, FrameTicks(LID_INTRO, 1000));
  ASSERT_EQ(3*VBLANK_TICKS, FrameTicks(LID_INTRO, 1001));
}

#define LAST_FRAME_RECORDED_AT 57106 /* jungle rollers' demo's frame 1253 */
#define LAG_FRAME_TICKS        51    /* the ps1 took a frame and a half */

UTEST(pace, a_demo_frame_waits_as_long_as_its_recorded_frame) {
  int32_t recorded = LAST_FRAME_RECORDED_AT + LAG_FRAME_TICKS;
  ASSERT_EQ(LAG_FRAME_TICKS, DemoFrameTicks(recorded, LAST_FRAME_RECORDED_AT));
}

UTEST(pace, a_demo_frame_recorded_before_the_last_doesnt_wait) {
  ASSERT_EQ(0, DemoFrameTicks(LAST_FRAME_RECORDED_AT - 1, LAST_FRAME_RECORDED_AT));
}

UTEST(pace, the_intro_lasts_as_long_as_on_the_ps1) {
  /* its 1106 frames last 45 s in a recording of the PS1's intro */
  ASSERT_NEAR(45.0, SecondsToFrame(LID_INTRO, 1106), 0.5);
}
