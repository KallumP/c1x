#include "utest.h"
#include "pc/gfx/magnitude.h"

UTEST(magnitude, squares_and_adds_two_scaled_down) {
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400) >> 13), SwSqrMagnitude2(300, 400));
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400) >> 13), SwSqrMagnitude2(-300, -400));
}

UTEST(magnitude, squares_and_adds_three_scaled_down) {
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400 + 1200 * 1200) >> 20), SwSqrMagnitude3(300, 400, 1200));
}
