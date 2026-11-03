#include "utest.h"
#include "launcher/settings_file.h"

#define LAUNCHER_SETTINGS_PATH "build/test_launcher_settings.cfg"

/* write contents to the launcher's test settings file */
static void WriteLauncherSettings(const char *contents) {
  FILE *file;

  file = fopen(LAUNCHER_SETTINGS_PATH, "wb");
  fputs(contents, file);
  fclose(file);
}

UTEST(launcher_settings, reads_a_settings_file) {
  pc_settings s;

  WriteLauncherSettings("# comment\nspeed_display = on\nreplay_speed = 4\nboot_level = tide_ruins\n");
  ASSERT_EQ(1, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s));
  ASSERT_EQ(1, s.speed_display);
  ASSERT_EQ(4u, s.replay_speed);
  ASSERT_STREQ("tide_ruins", s.boot_level);
  ASSERT_EQ(1, s.loading_screen); /* not in the file, so the default */
}

UTEST(launcher_settings, uses_the_defaults_without_a_settings_file) {
  pc_settings s;

  remove(LAUNCHER_SETTINGS_PATH);
  s.speed_display = 1;
  ASSERT_EQ(0, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s));
  ASSERT_EQ(0, s.speed_display);
  ASSERT_EQ(2000u, s.loading_screen_min_ms);
  ASSERT_STREQ("", s.boot_level);
}

UTEST(launcher_settings, skips_invalid_lines) {
  pc_settings s;

  WriteLauncherSettings("speed_display = maybe\nreplay_speed = 2\n");
  ASSERT_EQ(1, ReadSettingsFile(LAUNCHER_SETTINGS_PATH, &s));
  ASSERT_EQ(0, s.speed_display);
  ASSERT_EQ(2u, s.replay_speed);
}
