#include <stddef.h>
#include "utest.h"
#include "pc/settings.h"
#include "launcher/settings_file.h"
#include "test_files.h"

/* a number setting's value after SettingsReset, and the default it should have */
typedef struct {
  const char *name;
  uint32_t value;
  uint32_t expected;
} setting_default;

UTEST(settings, reset_gives_each_setting_its_default) {
  pc_settings s;
  int i;

  memset(&s, 0x55, sizeof(s)); /* so each default has to be set */
  SettingsReset(&s);
  {
    setting_default defaults[] = {
      { "loading_screen",        s.loading_screen,        1 },
      { "loading_screen_min_ms", s.loading_screen_min_ms, 2000 }, /* 2 seconds */
      { "speed_display",         s.speed_display,         0 },
      { "fps_display",           s.fps_display,           0 },
      { "spin_display",          s.spin_display,          0 },
      { "box_display",           s.box_display,           0 },
      { "skip_splash_screens",   s.skip_splash_screens,   0 },
      { "fix_model_draw_order",  s.fix_model_draw_order,  0 },
      { "replay_inputs",         s.replay_inputs,         0 },
      { "replay_speed",          s.replay_speed,          1 }, /* normal speed */
      { "frame_rate",            s.frame_rate,            60 },
    };

    for (i = 0; i < sizeof(defaults)/sizeof(defaults[0]); i++) {
      EXPECT_EQ_MSG(defaults[i].expected, defaults[i].value, defaults[i].name);
    }
  }
  ASSERT_STREQ("", s.boot_level);
}

/* the settings that are either on or off, and where each is kept */
static const struct {
  const char *name;
  size_t offset;
} on_off_settings[] = {
  { "loading_screen",       offsetof(pc_settings, loading_screen) },
  { "speed_display",        offsetof(pc_settings, speed_display) },
  { "fps_display",          offsetof(pc_settings, fps_display) },
  { "spin_display",         offsetof(pc_settings, spin_display) },
  { "box_display",          offsetof(pc_settings, box_display) },
  { "skip_splash_screens",  offsetof(pc_settings, skip_splash_screens) },
  { "fix_model_draw_order", offsetof(pc_settings, fix_model_draw_order) },
  { "replay_inputs",        offsetof(pc_settings, replay_inputs) },
};

#define ON_OFF_SETTING_COUNT (int)(sizeof(on_off_settings)/sizeof(on_off_settings[0]))

/* the flag in s for on_off_settings[index] */
static int *OnOffSetting(pc_settings *s, int index) {
  return (int*)((char*)s + on_off_settings[index].offset);
}

/* SettingsParseLine's result for "name = value" */
static int ParseSetting(const char *name, const char *value, pc_settings *s) {
  char line[128];

  snprintf(line, sizeof(line), "%s = %s", name, value);
  return SettingsParseLine(line, s);
}

UTEST(settings, on_off_settings_take_on_and_off) {
  pc_settings s;
  int i;

  for (i = 0; i < ON_OFF_SETTING_COUNT; i++) {
    SettingsReset(&s);
    EXPECT_EQ_MSG(1, ParseSetting(on_off_settings[i].name, "on", &s), on_off_settings[i].name);
    EXPECT_EQ_MSG(1, *OnOffSetting(&s, i), on_off_settings[i].name);
    EXPECT_EQ_MSG(1, ParseSetting(on_off_settings[i].name, "off", &s), on_off_settings[i].name);
    EXPECT_EQ_MSG(0, *OnOffSetting(&s, i), on_off_settings[i].name);
  }
}

UTEST(settings, on_off_settings_reject_other_values) {
  static const char *other_values[] = { "maybe", "yes", "1" };
  pc_settings s;
  int i, j, before;

  for (i = 0; i < ON_OFF_SETTING_COUNT; i++) {
    SettingsReset(&s);
    before = *OnOffSetting(&s, i);
    for (j = 0; j < sizeof(other_values)/sizeof(other_values[0]); j++) {
      EXPECT_EQ_MSG(-1, ParseSetting(on_off_settings[i].name, other_values[j], &s),
        on_off_settings[i].name);
    }
    EXPECT_EQ_MSG(before, *OnOffSetting(&s, i), on_off_settings[i].name);
  }
}

UTEST(settings, names_and_on_off_are_case_insensitive) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, SettingsParseLine("Loading_Screen = OFF", &s));
  ASSERT_EQ(0, s.loading_screen);
}

UTEST(settings, loading_screen_min_ms) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, SettingsParseLine("loading_screen_min_ms = 500", &s));
  ASSERT_EQ(500u, s.loading_screen_min_ms);
  ASSERT_EQ(1, SettingsParseLine("loading_screen_min_ms = 0", &s));
  ASSERT_EQ(0u, s.loading_screen_min_ms);
  ASSERT_EQ(1, SettingsParseLine("loading_screen_min_ms = 60000", &s));
  ASSERT_EQ(60000u, s.loading_screen_min_ms);
}

UTEST(settings, loading_screen_min_ms_rejects_bad_numbers) {
  pc_settings s, defaults;

  SettingsReset(&defaults);
  SettingsReset(&s);
  ASSERT_EQ(-1, SettingsParseLine("loading_screen_min_ms = 60001", &s));
  ASSERT_EQ(-1, SettingsParseLine("loading_screen_min_ms = -5", &s));
  ASSERT_EQ(-1, SettingsParseLine("loading_screen_min_ms = abc", &s));
  ASSERT_EQ(-1, SettingsParseLine("loading_screen_min_ms = 12abc", &s));
  ASSERT_EQ(-1, SettingsParseLine("loading_screen_min_ms = 99999999999", &s));
  ASSERT_EQ(defaults.loading_screen_min_ms, s.loading_screen_min_ms);
}

UTEST(settings, unknown_name_is_invalid) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(-1, SettingsParseLine("no_such_setting = on", &s));
}

#define SETTINGS_TEST_PATH "build/test_settings.cfg"

UTEST(settings, load_missing_file_keeps_defaults) {
  pc_settings defaults;

  SettingsReset(&defaults);
  SettingsReset(&game_settings);
  remove(SETTINGS_TEST_PATH);
  ASSERT_EQ(-1, SettingsLoad(SETTINGS_TEST_PATH));
  ASSERT_TRUE(AreSettingsEqual(&defaults, &game_settings));
}

UTEST(settings, load_applies_each_setting) {
  SettingsReset(&game_settings);
  WriteWholeFile(SETTINGS_TEST_PATH, "# settings\r\nloading_screen = off\r\nloading_screen_min_ms = 750\r\n");
  ASSERT_EQ(2, SettingsLoad(SETTINGS_TEST_PATH));
  ASSERT_EQ(0, game_settings.loading_screen);
  ASSERT_EQ(750u, game_settings.loading_screen_min_ms);
  SettingsReset(&game_settings);
}

UTEST(settings, load_skips_invalid_lines) {
  pc_settings defaults;

  SettingsReset(&defaults);
  SettingsReset(&game_settings);
  WriteWholeFile(SETTINGS_TEST_PATH, "no_such_setting = on\nloading_screen_min_ms = lots\nloading_screen = off\n");
  ASSERT_EQ(1, SettingsLoad(SETTINGS_TEST_PATH));
  ASSERT_EQ(0, game_settings.loading_screen);
  ASSERT_EQ(defaults.loading_screen_min_ms, game_settings.loading_screen_min_ms);
  SettingsReset(&game_settings);
}

/* give s values no settings line can (boot_level aside), so matching after a load proves each was read */
static void SetValuesNoLineCanGive(pc_settings *s) {
  memset(s, 0x55, sizeof(*s));
  s->boot_level[0] = 0;
}

/* the example file documents the defaults, so it must match them */
UTEST(settings, example_settings_file_matches_defaults) {
  pc_settings defaults;

  SettingsReset(&defaults);
  SetValuesNoLineCanGive(&game_settings);
  /* run from the project root */
  ASSERT_NE(-1, SettingsLoad("settings.example.cfg"));
  ASSERT_TRUE(AreSettingsEqual(&defaults, &game_settings));
  SettingsReset(&game_settings);
}

UTEST(settings, boot_level_takes_a_level_name) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, SettingsParseLine("boot_level = mock", &s));
  ASSERT_STREQ("mock", s.boot_level);
  ASSERT_EQ(1, SettingsParseLine("boot_level = beach_copy-2", &s));
  ASSERT_STREQ("beach_copy-2", s.boot_level);
}

UTEST(settings, boot_level_rejects_names_that_could_leave_the_folder) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(-1, SettingsParseLine("boot_level = ../streams/s0000009", &s));
  ASSERT_EQ(-1, SettingsParseLine("boot_level = a/b", &s));
  ASSERT_EQ(-1, SettingsParseLine("boot_level = a.nsd", &s));
  ASSERT_EQ(-1, SettingsParseLine("boot_level = abcdefghijabcdefghijabcdefghijabc", &s)); /* 33 */
  ASSERT_STREQ("", s.boot_level);
}

UTEST(settings, frame_rate_takes_30_to_240) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, SettingsParseLine("frame_rate = 144", &s));
  ASSERT_EQ(144u, s.frame_rate);
  ASSERT_EQ(1, SettingsParseLine("frame_rate = 30", &s));
  ASSERT_EQ(30u, s.frame_rate);
  ASSERT_EQ(1, SettingsParseLine("frame_rate = 240", &s));
  ASSERT_EQ(240u, s.frame_rate);
  ASSERT_EQ(-1, SettingsParseLine("frame_rate = 29", &s));
  ASSERT_EQ(-1, SettingsParseLine("frame_rate = 241", &s));
  ASSERT_EQ(-1, SettingsParseLine("frame_rate = fast", &s));
  ASSERT_EQ(240u, s.frame_rate);
}

UTEST(settings, replay_speed_takes_0_to_16) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, SettingsParseLine("replay_speed = 4", &s));
  ASSERT_EQ(4u, s.replay_speed);
  ASSERT_EQ(1, SettingsParseLine("replay_speed = 0", &s));
  ASSERT_EQ(0u, s.replay_speed);
  ASSERT_EQ(1, SettingsParseLine("replay_speed = 16", &s));
  ASSERT_EQ(16u, s.replay_speed);
  ASSERT_EQ(-1, SettingsParseLine("replay_speed = 17", &s));
  ASSERT_EQ(-1, SettingsParseLine("replay_speed = fast", &s));
  ASSERT_EQ(16u, s.replay_speed);
}
