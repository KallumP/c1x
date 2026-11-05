#include "utest.h"
#include "pc/sound/mix.h"

/* the voices are summed at their own levels, scaled down by MIX_HEADROOM,
   and clipped to the 16 bit sample range */

UTEST(mix, a_lone_voice_is_scaled_by_the_headroom) {
  ASSERT_EQ(3000 / MIX_HEADROOM, SwMixToSample(3000));
}

UTEST(mix, a_lone_full_scale_voice_is_not_quieted_by_the_voice_count) {
  ASSERT_GT(SwMixToSample(INT16_MAX), INT16_MAX / 24);
}

UTEST(mix, a_mix_louder_than_full_scale_is_clipped) {
  ASSERT_EQ(INT16_MAX, SwMixToSample(INT16_MAX * 24));
}

UTEST(mix, a_mix_quieter_than_negative_full_scale_is_clipped) {
  ASSERT_EQ(INT16_MIN, SwMixToSample(INT16_MIN * 24));
}
