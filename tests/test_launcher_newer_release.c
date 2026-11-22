#include <string.h>
#include "utest.h"
#include "launcher/newer_release.h"

/* the tools' path as ToolsCommand quotes it: double quotes for cmd.exe, single for sh */
#ifdef _WIN32
#define TOOLS "\"C:/games/c1x/build/c1x_tools.exe\""
#else
#define TOOLS "'C:/games/c1x/build/c1x_tools'"
#endif
#define REPO "C:/games/c1x"

UTEST(launcher_newer_release, a_version_is_two_numbers_with_a_dot_between) {
  ASSERT_TRUE(IsReleaseVersion("1.4"));
  ASSERT_TRUE(IsReleaseVersion("10.12"));
}

UTEST(launcher_newer_release, anything_else_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion(""));
  ASSERT_FALSE(IsReleaseVersion("1"));
  ASSERT_FALSE(IsReleaseVersion("1."));
  ASSERT_FALSE(IsReleaseVersion(".4"));
  ASSERT_FALSE(IsReleaseVersion("1.4.2"));
  ASSERT_FALSE(IsReleaseVersion("v1.4"));
  ASSERT_FALSE(IsReleaseVersion("1.x"));
  ASSERT_FALSE(IsReleaseVersion("1.4-beta"));
  ASSERT_FALSE(IsReleaseVersion("1.4 & calc"));
}

UTEST(launcher_newer_release, the_check_runs_from_the_tools_with_the_version) {
  char command[512];

  ASSERT_TRUE(NewerReleaseCommand(REPO, "10.12", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " check-update 10.12", command);
}

UTEST(launcher_newer_release, no_check_for_a_build_without_a_version) {
  char command[512];

  ASSERT_FALSE(NewerReleaseCommand(REPO, "", command, sizeof(command)));
}

UTEST(launcher_newer_release, no_check_for_a_version_that_isnt_two_numbers) {
  char command[512];

  ASSERT_FALSE(NewerReleaseCommand(REPO, "1.4 & calc", command, sizeof(command)));
}

UTEST(launcher_newer_release, no_check_for_a_version_longer_than_one_can_be) {
  char command[512];

  ASSERT_TRUE(NewerReleaseCommand(REPO, "1234567.1234567", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " check-update 1234567.1234567", command);
  ASSERT_FALSE(NewerReleaseCommand(REPO, "12345678.1234567", command, sizeof(command)));
}

UTEST(launcher_newer_release, a_newer_release_is_read_from_its_line) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_TRUE(FindNewerRelease("newer release: 1.5\n", version, sizeof(version)));
  ASSERT_STREQ("1.5", version);
}

UTEST(launcher_newer_release, a_newer_release_is_read_from_a_line_windows_ended) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_TRUE(FindNewerRelease("newer release: 10.12\r\n", version, sizeof(version)));
  ASSERT_STREQ("10.12", version);
}

UTEST(launcher_newer_release, a_newer_release_is_read_after_other_output) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_TRUE(FindNewerRelease("(node:1) Warning: something\nnewer release: 1.5\n",
    version, sizeof(version)));
  ASSERT_STREQ("1.5", version);
}

UTEST(launcher_newer_release, no_newer_release_when_the_check_says_nothing_of_one) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("", version, sizeof(version)));
  ASSERT_FALSE(FindNewerRelease("1.4 is the latest release\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_while_its_line_isnt_all_there) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: 1.1", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_with_a_version_that_isnt_two_numbers) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: latest\n", version, sizeof(version)));
  ASSERT_FALSE(FindNewerRelease("newer release: v1.5\n", version, sizeof(version)));
  ASSERT_FALSE(FindNewerRelease("newer release: 1.5 https://example.com\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, a_newer_release_fits_up_to_the_longest_a_version_can_be) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_TRUE(FindNewerRelease("newer release: 1234567.1234567\n", version, sizeof(version)));
  ASSERT_STREQ("1234567.1234567", version);
  ASSERT_FALSE(FindNewerRelease("newer release: 12345678.1234567\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, a_newer_release_has_to_fit_where_its_put) {
  char version[4] = "1.4";

  ASSERT_FALSE(FindNewerRelease("newer release: 1.10\n", version, sizeof(version)));
  ASSERT_STREQ("1.4", version);
}

UTEST(launcher_newer_release, the_version_is_left_as_it_was_without_a_newer_release) {
  char version[RELEASE_VERSION_MAX] = "1.4";

  ASSERT_FALSE(FindNewerRelease("newer release: latest\n", version, sizeof(version)));
  ASSERT_STREQ("1.4", version);
}

UTEST(launcher_newer_release, a_releases_label_is_its_version_after_a_v) {
  char label[VERSION_LABEL_MAX];

  VersionLabel("1.3", label, sizeof(label));
  ASSERT_STREQ("v1.3", label);
}

UTEST(launcher_newer_release, a_build_without_a_version_is_labelled_a_dev_build) {
  char label[VERSION_LABEL_MAX];

  VersionLabel("", label, sizeof(label));
  ASSERT_STREQ("dev build", label);
}
