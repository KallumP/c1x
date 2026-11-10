#include "utest.h"
#include "pc/gfx/magnitude.h"

UTEST(magnitude, squares_and_adds_two_scaled_down) {
  /* 300^2 + 400^2 = 250000, / 2^13 */
  ASSERT_EQ(30u, SwSqrMagnitude2(300, 400));
  ASSERT_EQ(30u, SwSqrMagnitude2(-300, -400));
}

UTEST(magnitude, squares_and_adds_three_scaled_down) {
  /* 3000^2 + 4000^2 + 12000^2 = 169000000, / 2^20 */
  ASSERT_EQ(161u, SwSqrMagnitude3(3000, 4000, 12000));
}

/* a sound 75 m ahead of the camera, as the audio code scales it (/32): 240000 */
UTEST(magnitude, a_sound_75_m_away_does_not_overflow) {
  ASSERT_EQ(7031250u, SwSqrMagnitude2(0, 240000)); /* 240000^2 = 57600000000, / 2^13 */
  ASSERT_EQ(109863u, SwSqrMagnitude3(0, 240000, 240000)); /* 2 * 240000^2, / 2^20 */
}

UTEST(magnitude, grows_the_further_off_a_sound_is) {
  uint32_t nearer = SwSqrMagnitude2(0, 40000);
  int32_t b;

  for (b = 40100; b <= 300000; b += 100) {
    uint32_t further = SwSqrMagnitude2(0, b);
    ASSERT_GT(further, nearer);
    ASSERT_GT(SwSqrMagnitude3(0, b, b), SwSqrMagnitude3(0, b - 100, b - 100));
    nearer = further;
  }
}
