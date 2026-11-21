#include "utest.h"
#include "pc/math.h"

/* angles are in 4096ths of a turn: 0x400 is a quarter, 0x200 an eighth */
#define EIGHTH_TURN 0x200

UTEST(math, atan2_of_a_diagonal_is_an_eighth_turn) {
  ASSERT_EQ(EIGHTH_TURN, matan2(0x4900, 0x4900));
}

UTEST(math, atan2_of_a_diagonal_keeps_its_quadrant) {
  ASSERT_EQ(-EIGHTH_TURN, matan2(-0x4900, 0x4900));
  ASSERT_EQ(0x800 - EIGHTH_TURN, matan2(0x4900, -0x4900));
  ASSERT_EQ(-(0x800 - EIGHTH_TURN), matan2(-0x4900, -0x4900));
}

UTEST(math, atan2_of_a_large_diagonal_is_an_eighth_turn) {
  ASSERT_EQ(EIGHTH_TURN, matan2(0x400000, 0x400000));
}

UTEST(math, atan2_along_an_axis_is_0_or_a_quarter_turn) {
  ASSERT_EQ(0, matan2(0, 0x4900));
  ASSERT_EQ(0x400, matan2(0x4900, 0));
}
