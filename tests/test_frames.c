#include "utest.h"
#include "pc/frames.h"

#define CRASH_FULL_SPIN_CHARGE 300 /* frames: WillC's spin charge cap (5 spins) */

UTEST(frames, start_late_enough_for_crash_to_spawn_with_a_full_spin_charge) {
  ASSERT_GE(GameFramesElapsed(0), (uint32_t)CRASH_FULL_SPIN_CHARGE);
}

UTEST(frames, count_one_frame_every_34_ticks) {
  ASSERT_EQ(GameFramesElapsed(0) + 10, GameFramesElapsed(34 * 10));
  ASSERT_EQ(GameFramesElapsed(0), GameFramesElapsed(33));
}
