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

UTEST(spin, a_stamp_ahead_of_now_leaves_none) {
  /* WillC adds the cost to the stamp, so spinning on an empty charge can put it ahead */
  ASSERT_EQ(0, SpinsLeft(1000, 1030));
}
