#include "utest.h"
#include "pc/gfx/magnitude.h"

UTEST(magnitude, squares_and_adds_two_scaled_down) {
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400) >> 13), SwSqrMagnitude2(300, 400));
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400) >> 13), SwSqrMagnitude2(-300, -400));
}

UTEST(magnitude, squares_and_adds_three_scaled_down) {
  ASSERT_EQ((uint32_t)((300 * 300 + 400 * 400 + 1200 * 1200) >> 20), SwSqrMagnitude3(300, 400, 1200));
}

/* a sound 75 m ahead of the camera, as the audio code scales it (/32): 240000 */
UTEST(magnitude, a_far_off_sound_is_far_off) {
  ASSERT_EQ((uint32_t)(((int64_t)240000 * 240000) >> 13), SwSqrMagnitude2(0, 240000));
  ASSERT_EQ((uint32_t)(((int64_t)240000 * 240000 * 2) >> 20), SwSqrMagnitude3(0, 240000, 240000));
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
