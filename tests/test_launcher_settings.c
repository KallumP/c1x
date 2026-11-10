#include "utest.h"
#include <SDL2/SDL.h>
#include "launcher/settings_file.h"
#include "test_files.h"

#define LAUNCHER_SETTINGS_PATH "build/test_launcher_settings.cfg"
#define LAUNCHER_SETTINGS_EXAMPLE_PATH "build/test_launcher_settings.example.cfg"

UTEST(launcher_settings, reads_a_settings_file) {
  pc_settings s, defaults;

  SettingsReset(&defaults);
  WriteWholeFile(LAUNCHER_SETTINGS_PATH, "# comment\nspeed_display = on\n");
  ASSERT_EQ(1, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s));
  ASSERT_EQ(1, s.speed_display);
  ASSERT_EQ(defaults.loading_screen, s.loading_screen); /* not in the file */
}

UTEST(launcher_settings, uses_the_defaults_without_a_settings_file) {
  pc_settings s, defaults;

  SettingsReset(&defaults);
  remove(LAUNCHER_SETTINGS_PATH);
  s.speed_display = !defaults.speed_display;
  ASSERT_EQ(0, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s));
  ASSERT_TRUE(AreSettingsEqual(&defaults, &s));
}

/* SetSettingLine's result for text, compared with expected, then freed */
static int SetLineGives(const char *text, const char *name, const char *value,
  const char *expected) {
  char *result;
  int same;

  result = SetSettingLine(text, name, value);
  same = strcmp(result, expected) == 0;
  if (!same) { printf("got \"%s\"\n", result); }
  SDL_free(result);
  return same;
}

UTEST(launcher_settings, set_changes_a_settings_line_and_keeps_the_rest) {
  ASSERT_TRUE(SetLineGives("# speed\nspeed_display = off\nreplay_speed = 1\n",
    "speed_display", "on",
    "# speed\nspeed_display = on\nreplay_speed = 1\n"));
}

UTEST(launcher_settings, set_adds_a_line_for_a_setting_not_in_the_file) {
  ASSERT_TRUE(SetLineGives("# settings\nreplay_speed = 1\n", "boot_level", "tide_ruins",
    "# settings\nreplay_speed = 1\nboot_level = tide_ruins\n"));
  ASSERT_TRUE(SetLineGives("replay_speed = 1", "boot_level", "tide_ruins",
    "replay_speed = 1\nboot_level = tide_ruins\n"));
  ASSERT_TRUE(SetLineGives("", "boot_level", "tide_ruins", "boot_level = tide_ruins\n"));
}

UTEST(launcher_settings, set_leaves_commented_out_lines) {
  ASSERT_TRUE(SetLineGives("# boot_level = mossy_creek\n", "boot_level", "tide_ruins",
    "# boot_level = mossy_creek\nboot_level = tide_ruins\n"));
}

UTEST(launcher_settings, set_keeps_windows_line_endings) {
  ASSERT_TRUE(SetLineGives("# speed\r\nspeed_display = off\r\n", "replay_speed", "4",
    "# speed\r\nspeed_display = off\r\nreplay_speed = 4\r\n"));
}

UTEST(launcher_settings, set_leaves_a_line_already_set_to_the_value) {
  ASSERT_TRUE(SetLineGives("Speed_Display = ON\n", "speed_display", "on",
    "Speed_Display = ON\n"));
}

UTEST(launcher_settings, save_keeps_the_settings_files_other_lines) {
  pc_settings s;
  char *text;

  WriteWholeFile(LAUNCHER_SETTINGS_PATH, "# mine\nspeed_display = off\nfavourite = crash\n");
  SettingsReset(&s);
  s.speed_display = 1;
  ASSERT_EQ(1, SaveSettingsFile(LAUNCHER_SETTINGS_PATH, "no_such_example.cfg", &s));
  text = ReadWholeFile(LAUNCHER_SETTINGS_PATH);
  ASSERT_TRUE(text != 0);
  ASSERT_TRUE(strstr(text, "# mine\n") == text);
  ASSERT_TRUE(strstr(text, "\nfavourite = crash\n") != 0);
  SDL_free(text);
}

UTEST(launcher_settings, save_starts_from_the_example_without_a_settings_file) {
  pc_settings s;
  char *text;

  remove(LAUNCHER_SETTINGS_PATH);
  WriteWholeFile(LAUNCHER_SETTINGS_EXAMPLE_PATH, "# example\nspeed_display = off\n");
  SettingsReset(&s);
  ASSERT_EQ(1, SaveSettingsFile(LAUNCHER_SETTINGS_PATH,
    LAUNCHER_SETTINGS_EXAMPLE_PATH, &s));
  text = ReadWholeFile(LAUNCHER_SETTINGS_PATH);
  ASSERT_TRUE(text != 0);
  ASSERT_TRUE(strstr(text, "# example\nspeed_display = off\n") == text);
  SDL_free(text);
}

UTEST(launcher_settings, saved_settings_read_back_the_same) {
  pc_settings s, read;

  remove(LAUNCHER_SETTINGS_PATH);
  SettingsReset(&s);
  s.loading_screen = 0;
  s.loading_screen_min_ms = 500;
  s.skip_splash_screens = 1;
  s.fix_model_draw_order = 1;
  s.replay_inputs = 1;
  s.replay_speed = 0;
  strcpy(s.boot_level, "tide_ruins");
  ASSERT_EQ(1, SaveSettingsFile(LAUNCHER_SETTINGS_PATH, "no_such_example.cfg", &s));
  ASSERT_EQ(1, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &read));
  ASSERT_TRUE(AreSettingsEqual(&s, &read));
}

/* CommentOutSettingLine's result for text, compared with expected, then freed */
static int CommentOutGives(const char *text, const char *name, const char *expected) {
  char *result;
  int same;

  result = CommentOutSettingLine(text, name);
  same = strcmp(result, expected) == 0;
  if (!same) { printf("got \"%s\"\n", result); }
  SDL_free(result);
  return same;
}

UTEST(launcher_settings, comment_out_comments_out_a_settings_line) {
  ASSERT_TRUE(CommentOutGives("replay_speed = 1\nboot_level = tide_ruins\n", "boot_level",
    "replay_speed = 1\n# boot_level = tide_ruins\n"));
  ASSERT_TRUE(CommentOutGives("boot_level = tide_ruins\r\nreplay_speed = 1\r\n", "boot_level",
    "# boot_level = tide_ruins\r\nreplay_speed = 1\r\n"));
}

UTEST(launcher_settings, comment_out_leaves_a_file_without_the_setting) {
  ASSERT_TRUE(CommentOutGives("# boot_level = tide_ruins\nreplay_speed = 1\n", "boot_level",
    "# boot_level = tide_ruins\nreplay_speed = 1\n"));
}

UTEST(launcher_settings, saving_the_title_screen_comments_out_boot_level) {
  pc_settings s;
  char *text;

  WriteWholeFile(LAUNCHER_SETTINGS_PATH, "boot_level = tide_ruins\n");
  ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s);
  s.boot_level[0] = 0;
  ASSERT_EQ(1, SaveSettingsFile(LAUNCHER_SETTINGS_PATH, "no_such_example.cfg", &s));
  text = ReadWholeFile(LAUNCHER_SETTINGS_PATH);
  ASSERT_TRUE(text != 0);
  ASSERT_TRUE(strstr(text, "# boot_level = tide_ruins\n") == text);
  SDL_free(text);
}

UTEST(launcher_settings, settings_differing_in_a_number_arent_equal) {
  pc_settings a, b;

  SettingsReset(&a);
  SettingsReset(&b);
  b.replay_speed = 4;
  ASSERT_FALSE(AreSettingsEqual(&a, &b));
}

UTEST(launcher_settings, settings_differing_in_boot_level_arent_equal) {
  pc_settings a, b;

  SettingsReset(&a);
  SettingsReset(&b);
  strcpy(b.boot_level, "tide_ruins");
  ASSERT_FALSE(AreSettingsEqual(&a, &b));
}

UTEST(launcher_settings, equal_settings_ignore_whats_after_boot_levels_end) {
  pc_settings a, b;

  SettingsReset(&a);
  SettingsReset(&b);
  /* a held a longer name first, so the bytes after its NUL differ from b's */
  strcpy(a.boot_level, "mossy_creek");
  strcpy(a.boot_level, "tide");
  strcpy(b.boot_level, "tide");
  ASSERT_TRUE(AreSettingsEqual(&a, &b));
}
