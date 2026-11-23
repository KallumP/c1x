#include <string.h>
#include "utest.h"
#include "launcher/online_levels.h"
#include "test_tools_command.h"

UTEST(launcher_online_levels, the_top_levels_list_runs_from_the_tools) {
  char command[512];

  ASSERT_TRUE(ListOnlineLevelsCommand(REPO, "", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " list-online-levels", command);
}

UTEST(launcher_online_levels, a_search_lists_the_levels_with_its_name) {
  char command[512];

  ASSERT_TRUE(ListOnlineLevelsCommand(REPO, "tide ruins-2_b", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " list-online-levels tide ruins-2_b", command);
}

UTEST(launcher_online_levels, a_search_with_other_characters_runs_nothing) {
  char command[512];

  ASSERT_FALSE(ListOnlineLevelsCommand(REPO, "tide & calc", command, sizeof(command)));
}

UTEST(launcher_online_levels, a_search_has_letters_numbers_spaces_dashes_underscores) {
  const char *allowed;

  for (allowed = "aZ7 -_"; *allowed; allowed++) {
    ASSERT_TRUE(IsSearchCharacter(*allowed));
  }
}

UTEST(launcher_online_levels, a_search_has_nothing_a_shell_or_mod_io_reads) {
  const char *refused;

  for (refused = "&\"'*%|;"; *refused; refused++) {
    ASSERT_FALSE(IsSearchCharacter(*refused));
  }
}

UTEST(launcher_online_levels, a_download_runs_from_the_tools_with_the_levels_id) {
  char command[512];

  ASSERT_TRUE(DownloadLevelCommand(REPO, 17302, command, sizeof(command)));
  ASSERT_STREQ(TOOLS " download-level 17302", command);
}

UTEST(launcher_online_levels, a_line_is_a_levels_id_author_name_and_page) {
  online_levels levels;

  FindOnlineLevels("online level: 17302\tkallum\tTide Ruins\t"
    "https://mod.io/m/tide\n", &levels);
  ASSERT_EQ(1, levels.count);
  ASSERT_EQ(17302, levels.ids[0]);
  ASSERT_STREQ("kallum", levels.authors[0]);
  ASSERT_STREQ("Tide Ruins", levels.names[0]);
  ASSERT_STREQ("https://mod.io/m/tide", levels.pages[0]);
}

UTEST(launcher_online_levels, each_line_is_a_level_in_order) {
  online_levels levels;

  FindOnlineLevels("online level: 1\ta\tOne\tp1\r\n"
    "online level: 2\tb\tTwo\tp2\r\n", &levels);
  ASSERT_EQ(2, levels.count);
  ASSERT_STREQ("One", levels.names[0]);
  ASSERT_STREQ("Two", levels.names[1]);
}

UTEST(launcher_online_levels, other_lines_arent_levels) {
  online_levels levels;

  FindOnlineLevels("no levels are on mod.io yet\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_line_not_all_there_yet_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 1\ta\tOne\tp1\n"
    "online level: 2\tb\tTwo\thttps://mo", &levels);
  ASSERT_EQ(1, levels.count);
}

UTEST(launcher_online_levels, a_line_without_an_author_and_name_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 1\tOne\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_line_without_a_page_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 1\ta\tOne\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_line_without_a_number_for_an_id_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: x\ta\tOne\tp\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_long_name_is_cut_short) {
  online_levels levels;
  char line[512];

  snprintf(line, sizeof(line), "online level: 1\ta\t%0300d\tp\n", 0);
  FindOnlineLevels(line, &levels);
  ASSERT_EQ(1, levels.count);
  ASSERT_EQ(ONLINE_LEVEL_TEXT_MAX - 1, (int)strlen(levels.names[0]));
}

UTEST(launcher_online_levels, no_more_levels_are_kept_than_fit) {
  online_levels levels;
  static char output[ONLINE_LEVELS_MAX * 40 + 100];
  size_t used;
  int i;

  output[0] = 0;
  for (i = 0; i < ONLINE_LEVELS_MAX + 2; i++) {
    used = strlen(output);
    snprintf(output + used, sizeof(output) - used, "online level: %d\ta\tL\tp\n", i + 1);
  }
  FindOnlineLevels(output, &levels);
  ASSERT_EQ(ONLINE_LEVELS_MAX, levels.count);
}

UTEST(launcher_online_levels, an_id_of_0_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 0\ta\tOne\tp\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, an_id_too_long_for_an_int_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 1234567890\ta\tOne\tp\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_page_too_long_to_keep_is_none) {
  static online_levels levels;
  static char line[MODIO_PAGE_MAX + 64];

  snprintf(line, sizeof(line), "online level: 1\ta\tOne\thttps://mod.io/%0*d\n",
    MODIO_PAGE_MAX, 0);
  FindOnlineLevels(line, &levels);
  ASSERT_EQ(1, levels.count);
  ASSERT_STREQ("", levels.pages[0]);
}
