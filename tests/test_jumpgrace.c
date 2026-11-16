#include "utest.h"
#include "pc/jumpgrace.h"

#define FALLING -136000 /* crash's velocity_y stepping off a ledge */
#define RISING  939200  /* and just after a jump */

/* crash on the floor, then off it for frames frames */
static jump_grace OffTheFloorFor(int frames) {
  jump_grace grace = { 0 };
  int i;

  JumpGraceTrackFloor(&grace, 1);
  for (i = 0; i < frames; i++)
    JumpGraceTrackFloor(&grace, 0);
  return grace;
}

UTEST(jumpgrace, a_jump_just_off_a_ledge_counts_as_on_the_floor) {
  jump_grace grace = OffTheFloorFor(1);
  ASSERT_TRUE(JumpGraceCountsAsFloor(&grace, FALLING, JUMP_GRACE_BUTTON));
}

UTEST(jumpgrace, a_jump_counts_for_5_frames_off_the_floor) {
  jump_grace last = OffTheFloorFor(JUMP_GRACE_FRAMES);
  jump_grace late = OffTheFloorFor(JUMP_GRACE_FRAMES + 1);
  ASSERT_TRUE(JumpGraceCountsAsFloor(&last, FALLING, JUMP_GRACE_BUTTON));
  ASSERT_FALSE(JumpGraceCountsAsFloor(&late, FALLING, JUMP_GRACE_BUTTON));
}

UTEST(jumpgrace, on_the_floor_needs_no_grace) {
  jump_grace grace = OffTheFloorFor(0);
  ASSERT_FALSE(JumpGraceCountsAsFloor(&grace, FALLING, JUMP_GRACE_BUTTON));
}

UTEST(jumpgrace, no_grace_without_a_jump_tapped) {
  jump_grace grace = OffTheFloorFor(1);
  ASSERT_FALSE(JumpGraceCountsAsFloor(&grace, FALLING, 0));
  ASSERT_FALSE(JumpGraceCountsAsFloor(&grace, FALLING, 0x80)); /* spin */
}

UTEST(jumpgrace, no_second_jump_while_rising) {
  jump_grace grace = OffTheFloorFor(1);
  ASSERT_FALSE(JumpGraceCountsAsFloor(&grace, RISING, JUMP_GRACE_BUTTON));
}

UTEST(jumpgrace, landing_starts_the_count_again) {
  jump_grace grace = OffTheFloorFor(JUMP_GRACE_FRAMES + 3);
  JumpGraceTrackFloor(&grace, 1);
  JumpGraceTrackFloor(&grace, 0);
  ASSERT_TRUE(JumpGraceCountsAsFloor(&grace, FALLING, JUMP_GRACE_BUTTON));
}
