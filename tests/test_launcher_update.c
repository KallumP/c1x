#include "utest.h"
#include "launcher/update.h"

#ifdef _WIN32
#define TOOLS "\"C:/games/c1x/build/c1x_tools.exe\""
#else
#define TOOLS "'C:/games/c1x/build/c1x_tools'"
#endif

UTEST(launcher_update, the_check_runs_from_the_tools_with_the_version) {
  char command[512];

  ASSERT_TRUE(UpdateCheckCommand("C:/games/c1x", "1.4", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " check-update 1.4", command);
}

UTEST(launcher_update, no_check_for_a_build_without_a_version) {
  char command[512];

  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", "", command, sizeof(command)));
}

UTEST(launcher_update, no_check_for_a_version_that_isnt_two_numbers) {
  char command[512];

  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", "1.4 & calc", command, sizeof(command)));
  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", "1", command, sizeof(command)));
  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", "1.", command, sizeof(command)));
  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", ".4", command, sizeof(command)));
  ASSERT_FALSE(UpdateCheckCommand("C:/games/c1x", "1.4.2", command, sizeof(command)));
}

UTEST(launcher_update, a_newer_release_is_read_from_the_checks_output) {
  newer_release release;

  ASSERT_TRUE(FindNewerRelease(
    "newer release: 1.5 https://github.com/KallumP/c1x/releases/tag/v1.5\r\n", &release));
  ASSERT_STREQ("1.5", release.version);
  ASSERT_STREQ("https://github.com/KallumP/c1x/releases/tag/v1.5", release.address);
}

UTEST(launcher_update, no_newer_release_when_the_check_says_nothing) {
  newer_release release;

  ASSERT_FALSE(FindNewerRelease("", &release));
}

UTEST(launcher_update, no_newer_release_while_its_line_isnt_all_there) {
  newer_release release;

  ASSERT_FALSE(FindNewerRelease("newer release: 1.5", &release));
  ASSERT_FALSE(FindNewerRelease("newer release: 1.5 https://github.com/KallumP/c1x/rele", &release));
}

UTEST(launcher_update, no_newer_release_with_a_page_that_isnt_one_of_c1xs_releases) {
  newer_release release;

  ASSERT_FALSE(FindNewerRelease("newer release: 1.5 https://example.com/c1x-1.5.exe\n", &release));
  ASSERT_FALSE(FindNewerRelease("newer release: 1.5 file:///C:/Windows/System32/calc.exe\n", &release));
}

UTEST(launcher_update, no_newer_release_with_a_version_that_isnt_two_numbers) {
  newer_release release;

  ASSERT_FALSE(FindNewerRelease(
    "newer release: latest https://github.com/KallumP/c1x/releases/tag/latest\n", &release));
}
