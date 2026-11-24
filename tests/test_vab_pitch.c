#include "utest.h"
#include "pc/sound/util.h"

/* a vab tone's shift (0-127) tunes it up in 128ths of a semitone, which the
   ps1 (libsnd's SsPitchFromNote) rounds down to 16ths: 6.25 cents each */

UTEST(vab_pitch, a_tone_without_a_shift_is_not_tuned) {
  ASSERT_EQ(0, VabShiftToFineTune(0));
}

UTEST(vab_pitch, the_bonus_rounds_lead_shift_tunes_up_half_a_semitone) {
  ASSERT_EQ(50, VabShiftToFineTune(70));
}

UTEST(vab_pitch, a_shift_short_of_a_16th_of_a_semitone_is_not_tuned) {
  ASSERT_EQ(0, VabShiftToFineTune(7));
}

UTEST(vab_pitch, a_shift_is_tuned_to_the_nearest_cent) {
  ASSERT_EQ(94, VabShiftToFineTune(124));
}
