#include <string.h>
#include <time.h>
#include "utest.h"
#include "launcher/newer_release.h"
#include "test_tools_command.h"

UTEST(launcher_newer_release, a_version_is_two_numbers_with_a_dot_between) {
  ASSERT_TRUE(IsReleaseVersion("1.4"));
  ASSERT_TRUE(IsReleaseVersion("10.12"));
}

UTEST(launcher_newer_release, nothing_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion(""));
}

UTEST(launcher_newer_release, one_number_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion("1"));
}

UTEST(launcher_newer_release, a_number_and_a_dot_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion("1."));
}

UTEST(launcher_newer_release, a_dot_and_a_number_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion(".4"));
}

UTEST(launcher_newer_release, three_numbers_arent_a_version) {
  ASSERT_FALSE(IsReleaseVersion("1.4.2"));
}

UTEST(launcher_newer_release, a_version_with_a_v_before_it_isnt_one) {
  ASSERT_FALSE(IsReleaseVersion("v1.4"));
}

UTEST(launcher_newer_release, a_letter_for_a_number_isnt_a_version) {
  ASSERT_FALSE(IsReleaseVersion("1.x"));
}

UTEST(launcher_newer_release, a_version_with_a_suffix_isnt_one) {
  ASSERT_FALSE(IsReleaseVersion("1.4-beta"));
}

UTEST(launcher_newer_release, a_version_with_a_command_after_it_isnt_one) {
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

UTEST(launcher_newer_release, the_check_runs_with_the_longest_version_there_can_be) {
  char command[512];

  ASSERT_TRUE(NewerReleaseCommand(REPO, "1234567.1234567", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " check-update 1234567.1234567", command);
}

UTEST(launcher_newer_release, no_check_for_a_version_longer_than_one_can_be) {
  char command[512];

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

UTEST(launcher_newer_release, no_newer_release_from_no_output) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_when_the_check_says_nothing_of_one) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("1.4 is the latest release\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_while_its_line_isnt_all_there) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: 1.1", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_when_its_line_has_a_word_for_a_version) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: latest\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_when_its_line_has_a_v_before_the_version) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: v1.5\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, no_newer_release_when_its_line_has_more_after_the_version) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_FALSE(FindNewerRelease("newer release: 1.5 https://example.com\n", version, sizeof(version)));
}

UTEST(launcher_newer_release, a_newer_release_fits_up_to_the_longest_a_version_can_be) {
  char version[RELEASE_VERSION_MAX];

  ASSERT_TRUE(FindNewerRelease("newer release: 1234567.1234567\n", version, sizeof(version)));
  ASSERT_STREQ("1234567.1234567", version);
}

UTEST(launcher_newer_release, no_newer_release_longer_than_a_version_can_be) {
  char version[RELEASE_VERSION_MAX];

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

/* 24 Nov 2026 at 11:52, in local time, as the label shows it */
static time_t BuiltAt(void) {
  struct tm built;

  memset(&built, 0, sizeof(built));
  built.tm_year = 2026 - 1900;
  built.tm_mon = 10;
  built.tm_mday = 24;
  built.tm_hour = 11;
  built.tm_min = 52;
  built.tm_isdst = -1;
  return mktime(&built);
}

UTEST(launcher_newer_release, a_releases_label_is_its_version_after_a_v) {
  char label[VERSION_LABEL_MAX];

  VersionLabel("1.3", BuiltAt(), label, sizeof(label));
  ASSERT_STREQ("v1.3", label);
}

UTEST(launcher_newer_release, a_dev_builds_label_says_when_it_was_built) {
  char label[VERSION_LABEL_MAX];

  VersionLabel("", BuiltAt(), label, sizeof(label));
  ASSERT_STREQ("dev build, built 24 Nov 11:52", label);
}

UTEST(launcher_newer_release, a_dev_build_built_at_an_unknown_time_is_labelled_a_dev_build) {
  char label[VERSION_LABEL_MAX];

  VersionLabel("", 0, label, sizeof(label));
  ASSERT_STREQ("dev build", label);
}
