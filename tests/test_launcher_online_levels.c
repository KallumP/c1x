#include <string.h>
#include "utest.h"
#include "launcher/online_levels.h"

/* the tools' path as ToolsCommand quotes it: double quotes for cmd.exe, single for sh */
#ifdef _WIN32
#define TOOLS "\"C:/games/c1x/build/c1x_tools.exe\""
#else
#define TOOLS "'C:/games/c1x/build/c1x_tools'"
#endif
#define REPO "C:/games/c1x"

UTEST(launcher_online_levels, the_list_runs_from_the_tools) {
  char command[512];

  ASSERT_TRUE(ListOnlineLevelsCommand(REPO, command, sizeof(command)));
  ASSERT_STREQ(TOOLS " list-online-levels", command);
}

UTEST(launcher_online_levels, a_download_runs_from_the_tools_with_the_levels_id) {
  char command[512];

  ASSERT_TRUE(DownloadLevelCommand(REPO, 17302, command, sizeof(command)));
  ASSERT_STREQ(TOOLS " download-level 17302", command);
}

UTEST(launcher_online_levels, a_line_is_a_levels_id_author_and_name) {
  online_levels levels;

  FindOnlineLevels("online level: 17302\tkallum\tTide Ruins\n", &levels);
  ASSERT_EQ(1, levels.count);
  ASSERT_EQ(17302, levels.ids[0]);
  ASSERT_STREQ("kallum", levels.authors[0]);
  ASSERT_STREQ("Tide Ruins", levels.names[0]);
}

UTEST(launcher_online_levels, each_line_is_a_level_in_order) {
  online_levels levels;

  FindOnlineLevels("online level: 1\ta\tOne\r\nonline level: 2\tb\tTwo\r\n", &levels);
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

  FindOnlineLevels("online level: 1\ta\tOne\nonline level: 2\tb\tTw", &levels);
  ASSERT_EQ(1, levels.count);
}

UTEST(launcher_online_levels, a_line_without_an_author_and_name_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: 1\tOne\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_line_without_a_number_for_an_id_isnt_a_level) {
  online_levels levels;

  FindOnlineLevels("online level: x\ta\tOne\n", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_online_levels, a_long_name_is_cut_short) {
  online_levels levels;
  char line[512];

  snprintf(line, sizeof(line), "online level: 1\ta\t%0300d\n", 0);
  FindOnlineLevels(line, &levels);
  ASSERT_EQ(1, levels.count);
  ASSERT_EQ(ONLINE_LEVEL_TEXT_MAX - 1, (int)strlen(levels.names[0]));
}

UTEST(launcher_online_levels, no_more_levels_are_kept_than_fit) {
  online_levels levels;
  static char output[ONLINE_LEVELS_MAX * 40 + 100];
  int i;

  output[0] = 0;
  for (i = 0; i < ONLINE_LEVELS_MAX + 2; i++) {
    snprintf(output + strlen(output), sizeof(output) - strlen(output), "online level: %d\ta\tL\n", i + 1);
  }
  FindOnlineLevels(output, &levels);
  ASSERT_EQ(ONLINE_LEVELS_MAX, levels.count);
}
