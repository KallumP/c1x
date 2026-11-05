#include "utest.h"
#include "pc/boot.h"

UTEST(boot, boot_level_intro_starts_in_the_lab_intro) {
  ASSERT_TRUE(BootLevelIsIntro("intro"));
  ASSERT_EQ(LID_INTRO, BOOT_INTRO_LID);
}

UTEST(boot, any_other_boot_level_is_a_custom_level) {
  ASSERT_FALSE(BootLevelIsIntro("tide_ruins"));
  ASSERT_FALSE(BootLevelIsIntro("intro2"));
  ASSERT_FALSE(BootLevelIsIntro(""));
}
