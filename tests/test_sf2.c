#include <stdint.h>
#include "utest.h"
#include "pc/sound/formats/sf2.h"

/*
 * the soundfont is written by laying these structs out in memory, so each
 * one must be exactly the size the SF2 spec gives its record
 */

UTEST(sf2, modulator_is_2_bytes) {
  ASSERT_EQ(2, (int)sizeof(SFModulator));
}

UTEST(sf2, modulator_list_record_is_10_bytes) {
  ASSERT_EQ(10, (int)sizeof(sfModList));
  ASSERT_EQ(10, (int)sizeof(sfInstModList));
}

UTEST(sf2, generator_and_transform_are_2_bytes) {
  ASSERT_EQ(2, (int)sizeof(SFGenerator));
  ASSERT_EQ(2, (int)sizeof(SFTransform));
}

UTEST(sf2, other_records_have_spec_sizes) {
  ASSERT_EQ(38, (int)sizeof(sfPresetHeader));
  ASSERT_EQ(4, (int)sizeof(sfPresetBag));
  ASSERT_EQ(4, (int)sizeof(sfGenList));
  ASSERT_EQ(22, (int)sizeof(sfInst));
  ASSERT_EQ(4, (int)sizeof(sfInstBag));
  ASSERT_EQ(46, (int)sizeof(sfSample));
}

/* the general controllers a modulator's source can be (SF2 2.01, 8.2.1) */
UTEST(sf2, controller_palette_has_spec_numbers) {
  ASSERT_EQ(0, (int)noController);
  ASSERT_EQ(2, (int)noteOnVel);
  ASSERT_EQ(3, (int)noteOnKeynum);
  ASSERT_EQ(10, (int)polyPressure);
  ASSERT_EQ(13, (int)chanPressure);
  ASSERT_EQ(14, (int)pitchWheel);
  ASSERT_EQ(16, (int)pitchWheelSens);
  ASSERT_EQ(127, (int)link);
}
