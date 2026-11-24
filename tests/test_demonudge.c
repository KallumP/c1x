#include "utest.h"
#include "pc/demonudge.h"
#include "pc/pad.h"

#define FRAME_BEFORE_WALK 1245
#define FIRST_STILL_FRAME 1246 /* crash has landed in front of the last crate */
#define FRAME_AFTER_WALK  1252
#define NOTHING_HELD      0

UTEST(demonudge, jungle_rollers_demo_walks_crash_forward_before_the_last_crate) {
  uint32_t held = DemoNudgedHeld(LID_JUNGLEROLLERS, DEMO_NUDGE_FRAME_COUNT,
    FIRST_STILL_FRAME, NOTHING_HELD);
  ASSERT_EQ((uint32_t)PAD_UP, held);
}

UTEST(demonudge, the_walk_starts_once_crash_has_landed) {
  uint32_t held = DemoNudgedHeld(LID_JUNGLEROLLERS, DEMO_NUDGE_FRAME_COUNT,
    FRAME_BEFORE_WALK, NOTHING_HELD);
  ASSERT_EQ((uint32_t)NOTHING_HELD, held);
}

UTEST(demonudge, the_walk_ends_after_six_frames) {
  uint32_t held = DemoNudgedHeld(LID_JUNGLEROLLERS, DEMO_NUDGE_FRAME_COUNT,
    FRAME_AFTER_WALK, NOTHING_HELD);
  ASSERT_EQ((uint32_t)NOTHING_HELD, held);
}

UTEST(demonudge, another_jungle_rollers_demo_plays_as_recorded) {
  uint32_t held = DemoNudgedHeld(LID_JUNGLEROLLERS, DEMO_NUDGE_FRAME_COUNT - 1,
    FIRST_STILL_FRAME, NOTHING_HELD);
  ASSERT_EQ((uint32_t)NOTHING_HELD, held);
}

UTEST(demonudge, another_levels_demo_plays_as_recorded) {
  uint32_t held = DemoNudgedHeld(LID_BOULDERS, DEMO_NUDGE_FRAME_COUNT,
    FIRST_STILL_FRAME, NOTHING_HELD);
  ASSERT_EQ((uint32_t)NOTHING_HELD, held);
}
