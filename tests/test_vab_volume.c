#include "utest.h"
#include "pc/sound/util.h"

/* a vab's tone and program volumes (0-127) each scale a note's amplitude
   by vol/127; the soundfont takes that as an attenuation in centibels */

UTEST(vab_volume, full_volume_is_not_attenuated) {
  ASSERT_EQ(0, VabVolumeToAttenuation(127, 127));
}

UTEST(vab_volume, half_tone_volume_is_6_db_quieter) {
  ASSERT_EQ(60, VabVolumeToAttenuation(64, 127));
}

UTEST(vab_volume, half_program_volume_is_6_db_quieter) {
  ASSERT_EQ(60, VabVolumeToAttenuation(127, 64));
}

UTEST(vab_volume, tone_and_program_volumes_multiply) {
  ASSERT_EQ(119, VabVolumeToAttenuation(64, 64));
}

UTEST(vab_volume, native_fortress_gong_is_about_4_6_db_quieter) {
  ASSERT_EQ(46, VabVolumeToAttenuation(75, 127));
}

UTEST(vab_volume, zero_volume_is_fully_attenuated) {
  ASSERT_EQ(1440, VabVolumeToAttenuation(0, 127));
  ASSERT_EQ(1440, VabVolumeToAttenuation(127, 0));
}

/* fluidsynth applies 0.4 of an initialAttenuation (as the emu8000 did), so
   the soundfont carries it scaled up to come out as the given centibels */

UTEST(vab_volume, no_attenuation_stays_none_for_fluidsynth) {
  ASSERT_EQ(0, FluidSynthAttenuation(0));
}

UTEST(vab_volume, fluidsynth_attenuation_is_scaled_up_by_2_5) {
  ASSERT_EQ(115, FluidSynthAttenuation(46));
}

UTEST(vab_volume, fluidsynth_attenuation_stops_at_the_soundfont_maximum) {
  ASSERT_EQ(1440, FluidSynthAttenuation(600));
}
