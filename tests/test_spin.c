#include "utest.h"
#include "pc/spin.h"

UTEST(spin, a_new_crash_long_into_the_game_has_all_5_spins) {
  ASSERT_EQ(5, SpinsLeft(10000, 0));
}

UTEST(spin, a_spin_from_full_leaves_4) {
  /* WillC, spinning with a full charge: stamp = now - cap + cost */
  ASSERT_EQ(4, SpinsLeft(1000, 1000 - SPIN_CHARGE_CAP + SPIN_COST));
}

UTEST(spin, a_spin_refills_after_2_seconds) {
  ASSERT_EQ(0, SpinsLeft(1000, 1000 - SPIN_COST + 1));
  ASSERT_EQ(1, SpinsLeft(1000, 1000 - SPIN_COST));
  ASSERT_EQ(1, SpinsLeft(1000, 1000 - (2 * SPIN_COST) + 1));
}

UTEST(spin, nothing_to_refill_with_all_5_spins) {
  ASSERT_EQ(0, SpinRefillFrames(10000, 0));
  ASSERT_EQ(0, SpinRefillFrames(1000, 1000 - SPIN_CHARGE_CAP));
}

UTEST(spin, refill_counts_down_to_the_next_spin) {
  ASSERT_EQ(SPIN_COST, SpinRefillFrames(1000, 1000));          /* just spun the last */
  ASSERT_EQ(1, SpinRefillFrames(1000, 1000 - SPIN_COST + 1));
  ASSERT_EQ(SPIN_COST, SpinRefillFrames(1000, 1000 - SPIN_COST)); /* one back, the next 2 s off */
  ASSERT_EQ(SPIN_COST - 1, SpinRefillFrames(1000, 1000 - SPIN_COST - 1));
}

UTEST(spin, refill_waits_out_a_stamp_ahead_of_now) {
  ASSERT_EQ(SPIN_COST + 30, SpinRefillFrames(1000, 1030));
}

UTEST(spin, frames_as_tenths_of_a_second_round_up) {
  ASSERT_EQ(20, SpinFramesAsTenths(60));
  ASSERT_EQ(1, SpinFramesAsTenths(1));
  ASSERT_EQ(1, SpinFramesAsTenths(3));
  ASSERT_EQ(2, SpinFramesAsTenths(4));
  ASSERT_EQ(0, SpinFramesAsTenths(0));
}

UTEST(spin, a_stamp_ahead_of_now_leaves_none) {
  /* WillC adds the cost to the stamp, so spinning on an empty charge can put it ahead */
  ASSERT_EQ(0, SpinsLeft(1000, 1030));
}
