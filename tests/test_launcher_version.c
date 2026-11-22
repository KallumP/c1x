#include "utest.h"
#include "launcher/version.h"

/* the launcher's arguments, as main gets them: argv[0] is the program */
static char *program_only[] = { "c1x_launcher" };
static char *version_flag[] = { "c1x_launcher", "--version" };
static char *version_flag_and_more[] = { "c1x_launcher", "--version", "now" };
static char *another_flag[] = { "c1x_launcher", "--help" };

UTEST(launcher_version, the_version_is_asked_with_the_version_flag_alone) {
  ASSERT_TRUE(IsVersionAsked(2, version_flag));
}

UTEST(launcher_version, the_version_isnt_asked_without_arguments) {
  ASSERT_FALSE(IsVersionAsked(1, program_only));
}

UTEST(launcher_version, the_version_isnt_asked_with_anything_after_the_flag) {
  ASSERT_FALSE(IsVersionAsked(3, version_flag_and_more));
}

UTEST(launcher_version, the_version_isnt_asked_by_another_flag) {
  ASSERT_FALSE(IsVersionAsked(2, another_flag));
}
