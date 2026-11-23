#include <string.h>
#include "utest.h"
#include "launcher/level_title.h"

/* the title shown for the level in folder, whose level.cfg's text is cfg */
static const char *TitleOf(const char *folder, const char *cfg) {
  static char title[LEVEL_TITLE_MAX];

  LevelTitle(folder, cfg, title, sizeof(title));
  return title;
}

UTEST(launcher_level_title, is_the_folders_name_in_words) {
  ASSERT_STREQ("Facing Castle", TitleOf("facing_castle", ""));
}

UTEST(launcher_level_title, leaves_out_the_number_ordering_the_levels) {
  ASSERT_STREQ("Tide Ruins", TitleOf("1_tide_ruins", ""));
}

UTEST(launcher_level_title, leaves_out_what_the_loading_screen_cant_draw) {
  ASSERT_STREQ("Level", TitleOf("level_2", ""));
}

UTEST(launcher_level_title, is_the_folders_name_when_none_of_it_can_be_drawn) {
  ASSERT_STREQ("2024", TitleOf("2024", ""));
}

UTEST(launcher_level_title, is_the_level_cfgs_title) {
  const char *cfg;

  cfg = "turn = 0\ntitle = Grave Switchback\n";
  ASSERT_STREQ("Grave Switchback", TitleOf("5_grave_switchback", cfg));
}

UTEST(launcher_level_title, is_the_folders_name_in_words_when_the_level_cfgs_is_empty) {
  ASSERT_STREQ("Tide Ruins", TitleOf("1_tide_ruins", "title =\n"));
}

UTEST(launcher_level_title, is_the_folders_name_in_words_when_the_level_cfgs_cant_be_drawn) {
  ASSERT_STREQ("Tide Ruins", TitleOf("1_tide_ruins", "title = Tide Ruins 2\n"));
}

UTEST(launcher_level_title, is_the_folders_name_in_words_when_the_level_cfgs_is_too_long) {
  const char *cfg;

  cfg = "title = The Very Long Tide Ruins Of Doom\n";
  ASSERT_STREQ("Tide Ruins", TitleOf("1_tide_ruins", cfg));
}
