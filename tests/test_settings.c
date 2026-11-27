#include <stddef.h>
#include <SDL2/SDL.h>
#include "utest.h"
#include "pc/settings.h"
#include "launcher/settings_file.h"
#include "test_files.h"

/* the settings that are either on or off, and where each is kept */
static const struct {
  const char *name;
  size_t offset;
} on_off_settings[] = {
  { "skip_loading_screen",  offsetof(pc_settings, skip_loading_screen) },
  { "speed_display",        offsetof(pc_settings, speed_display) },
  { "fps_display",          offsetof(pc_settings, fps_display) },
  { "spin_display",         offsetof(pc_settings, spin_display) },
  { "box_display",          offsetof(pc_settings, box_display) },
  { "skip_splash_screens",  offsetof(pc_settings, skip_splash_screens) },
  { "fix_model_draw_order", offsetof(pc_settings, fix_model_draw_order) },
  { "spin_ledge_jump",      offsetof(pc_settings, spin_ledge_jump) },
  { "replay_inputs",        offsetof(pc_settings, replay_inputs) },
  { "fullscreen",           offsetof(pc_settings, fullscreen) },
  { "memory_card",          offsetof(pc_settings, memory_card) },
  { "mute",                 offsetof(pc_settings, mute) },
  { "two_players",          offsetof(pc_settings, two_players) },
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
  ASSERT_EQ(1, SettingsParseLine("Skip_Loading_Screen = ON", &s));
  ASSERT_EQ(1, s.skip_loading_screen);
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
  WriteWholeFile(SETTINGS_TEST_PATH, "# settings\r\nskip_loading_screen = on\r\nloading_screen_min_ms = 750\r\n");
  ASSERT_EQ(2, SettingsLoad(SETTINGS_TEST_PATH));
  ASSERT_EQ(1, game_settings.skip_loading_screen);
  ASSERT_EQ(750u, game_settings.loading_screen_min_ms);
  SettingsReset(&game_settings);
}

UTEST(settings, load_skips_invalid_lines) {
  pc_settings defaults;

  SettingsReset(&defaults);
  SettingsReset(&game_settings);
  WriteWholeFile(SETTINGS_TEST_PATH, "no_such_setting = on\nloading_screen_min_ms = lots\nskip_loading_screen = on\n");
  ASSERT_EQ(1, SettingsLoad(SETTINGS_TEST_PATH));
  ASSERT_EQ(1, game_settings.skip_loading_screen);
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

UTEST(settings, the_loading_screen_shows_by_default) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(0, s.skip_loading_screen);
}

UTEST(settings, spin_ledge_jump_is_on_by_default) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, s.spin_ledge_jump);
}

UTEST(settings, one_player_by_default) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(0, s.two_players);
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

UTEST(settings, the_memory_card_is_off_unless_its_turned_on) {
  pc_settings s;

  s.memory_card = 1;
  SettingsReset(&s);
  ASSERT_EQ(0, s.memory_card);
}

UTEST(settings, mute_is_off_unless_its_turned_on) {
  pc_settings s;

  s.mute = 1;
  SettingsReset(&s);
  ASSERT_EQ(0, s.mute);
}

/* the settings that are a colour, and where each is kept */
static const struct {
  const char *name;
  size_t offset;
  uint32_t by_default;
} color_settings[] = {
  { "p1_fur_color",    offsetof(pc_settings, outfits[0].fur),    CRASH_FUR_COLOR },
  { "p1_belly_color",  offsetof(pc_settings, outfits[0].belly),  CRASH_BELLY_COLOR },
  { "p1_hair_color",   offsetof(pc_settings, outfits[0].hair),   CRASH_HAIR_COLOR },
  { "p1_shorts_color", offsetof(pc_settings, outfits[0].shorts), CRASH_SHORTS_COLOR },
  { "p1_shoes_color",  offsetof(pc_settings, outfits[0].shoes),  CRASH_SHOES_COLOR },
  { "p2_fur_color",    offsetof(pc_settings, outfits[1].fur),    SKUNK_FUR_COLOR },
  { "p2_belly_color",  offsetof(pc_settings, outfits[1].belly),  SKUNK_BELLY_COLOR },
  { "p2_hair_color",   offsetof(pc_settings, outfits[1].hair),   SKUNK_HAIR_COLOR },
  { "p2_shorts_color", offsetof(pc_settings, outfits[1].shorts), SKUNK_SHORTS_COLOR },
  { "p2_shoes_color",  offsetof(pc_settings, outfits[1].shoes),  SKUNK_SHOES_COLOR },
};

#define COLOR_SETTING_COUNT (int)(sizeof(color_settings)/sizeof(color_settings[0]))

static uint32_t *ColorSetting(pc_settings *s, int index) {
  return (uint32_t*)((char*)s + color_settings[index].offset);
}

UTEST(settings, player_one_is_crashs_own_colours_and_player_two_his_own_by_default) {
  pc_settings s;
  int i;

  SettingsReset(&s);
  for (i=0;i<COLOR_SETTING_COUNT;i++)
    ASSERT_EQ(color_settings[i].by_default, *ColorSetting(&s, i));
}

UTEST(settings, colour_settings_take_six_hex_digits_as_red_green_blue) {
  pc_settings s;
  int i;

  for (i=0;i<COLOR_SETTING_COUNT;i++) {
    SettingsReset(&s);
    ASSERT_EQ(1, ParseSetting(color_settings[i].name, "1a2B3c", &s));
    ASSERT_EQ((uint32_t)0x1A2B3C, *ColorSetting(&s, i));
  }
}

UTEST(settings, colour_settings_reject_anything_but_six_hex_digits) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(-1, ParseSetting("p1_fur_color", "", &s));
  ASSERT_EQ(-1, ParseSetting("p1_fur_color", "fff", &s));
  ASSERT_EQ(-1, ParseSetting("p1_fur_color", "1a2b3c4", &s));
  ASSERT_EQ(-1, ParseSetting("p1_fur_color", "1a2b3g", &s));
  ASSERT_EQ(-1, ParseSetting("p1_fur_color", "green", &s));
  ASSERT_EQ((uint32_t)CRASH_FUR_COLOR, s.outfits[0].fur);
}

UTEST(settings, player_twos_default_outfit_isnt_crashs_own) {
  crash_outfit one = SettingsDefaultOutfit(0), two = SettingsDefaultOutfit(1);

  ASSERT_EQ((uint32_t)CRASH_FUR_COLOR, one.fur);
  ASSERT_NE(one.fur, two.fur);
  ASSERT_NE(one.shorts, two.shorts);
  ASSERT_NE(one.shoes, two.shoes);
  ASSERT_NE(one.belly, two.belly);
  ASSERT_NE(one.hair, two.hair);
}

UTEST(settings, a_colour_for_a_player_there_isnt_is_invalid) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(-1, ParseSetting("p3_fur_color", "00ff00", &s));
}

UTEST(settings, a_colour_for_a_part_there_isnt_is_invalid) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(-1, ParseSetting("p1_eyes_color", "00ff00", &s));
}

UTEST(settings, colour_setting_names_are_case_insensitive) {
  pc_settings s;

  SettingsReset(&s);
  ASSERT_EQ(1, ParseSetting("P2_Fur_Color", "00ff00", &s));
  ASSERT_EQ((uint32_t)0x00FF00, s.outfits[1].fur);
}

UTEST(settings, player_two_starts_as_the_skunk) {
  crash_outfit two = SettingsDefaultOutfit(1);

  ASSERT_TRUE(OutfitsEqual(&two, &outfit_presets[OUTFIT_PRESET_SKUNK].outfit));
}

#define TEST_RECORDED_SETTINGS "build/test_recording.settings"

UTEST(settings, a_replay_plays_with_its_recordings_settings) {
  pc_settings own = game_settings;

  WriteWholeFile(TEST_RECORDED_SETTINGS, "two_players = on\nspin_ledge_jump = off\nboot_level = my_level\n");
  SettingsReset(&game_settings);
  game_settings.skip_splash_screens = 0;
  ASSERT_EQ(1, SettingsLoadRecorded(TEST_RECORDED_SETTINGS));
  ASSERT_EQ(1, game_settings.two_players);
  ASSERT_EQ(0, game_settings.spin_ledge_jump);
  ASSERT_STREQ("my_level", game_settings.boot_level);
  ASSERT_EQ(1, game_settings.skip_splash_screens); /* not in the recording's file, so the default */
  game_settings = own;
}

UTEST(settings, a_replay_keeps_the_players_own_way_of_watching_it) {
  pc_settings own = game_settings;

  WriteWholeFile(TEST_RECORDED_SETTINGS,
    "replay_inputs = off\nreplay_speed = 1\nframe_rate = 60\nfullscreen = off\nmute = off\n");
  SettingsReset(&game_settings);
  game_settings.replay_inputs = 1;
  game_settings.replay_speed = 8;
  game_settings.frame_rate = 144;
  game_settings.fullscreen = 1;
  game_settings.mute = 1;
  ASSERT_EQ(1, SettingsLoadRecorded(TEST_RECORDED_SETTINGS));
  ASSERT_EQ(1, game_settings.replay_inputs);
  ASSERT_EQ(8u, game_settings.replay_speed);
  ASSERT_EQ(144u, game_settings.frame_rate);
  ASSERT_EQ(1, game_settings.fullscreen);
  ASSERT_EQ(1, game_settings.mute);
  game_settings = own;
}

UTEST(settings, a_replay_without_its_settings_file_keeps_the_players_own) {
  pc_settings own = game_settings;

  remove("build/no_such_recording.settings");
  SettingsReset(&game_settings);
  game_settings.two_players = 1;
  ASSERT_EQ(0, SettingsLoadRecorded("build/no_such_recording.settings"));
  ASSERT_EQ(1, game_settings.two_players);
  game_settings = own;
}

UTEST(settings, a_replay_keeps_the_players_own_hud_displays) {
  WriteWholeFile(TEST_RECORDED_SETTINGS,
    "fps_display = off\nspeed_display = off\nspin_display = off\nbox_display = off\n");
  SettingsReset(&game_settings);
  game_settings.fps_display = 1;
  game_settings.speed_display = 1;
  game_settings.spin_display = 1;
  game_settings.box_display = 1;
  ASSERT_EQ(1, SettingsLoadRecorded(TEST_RECORDED_SETTINGS));
  ASSERT_EQ(1, game_settings.fps_display);
  ASSERT_EQ(1, game_settings.speed_display);
  ASSERT_EQ(1, game_settings.spin_display);
  ASSERT_EQ(1, game_settings.box_display);
  SettingsReset(&game_settings);
}
