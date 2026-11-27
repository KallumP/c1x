/*
 * game settings (pc), read from settings.cfg
 */
#include <SDL2/SDL.h>
#include "settings.h"
#include "config.h"

pc_settings game_settings; /* SettingsReset gives it the defaults, at startup (init.c) */

const settings_color settings_colors[SETTINGS_COLOR_COUNT] = {
  { "p1_fur_color",    0, offsetof(crash_outfit, fur) },
  { "p1_belly_color",  0, offsetof(crash_outfit, belly) },
  { "p1_hair_color",   0, offsetof(crash_outfit, hair) },
  { "p1_shorts_color", 0, offsetof(crash_outfit, shorts) },
  { "p1_shoes_color",  0, offsetof(crash_outfit, shoes) },
  { "p2_fur_color",    1, offsetof(crash_outfit, fur) },
  { "p2_belly_color",  1, offsetof(crash_outfit, belly) },
  { "p2_hair_color",   1, offsetof(crash_outfit, hair) },
  { "p2_shorts_color", 1, offsetof(crash_outfit, shorts) },
  { "p2_shoes_color",  1, offsetof(crash_outfit, shoes) },
};

static const int start_presets[SETTINGS_PLAYER_COUNT] = { OUTFIT_PRESET_DEFAULT, OUTFIT_PRESET_SKUNK };

crash_outfit SettingsDefaultOutfit(int player_idx) {
  return outfit_presets[start_presets[player_idx]].outfit;
}

static void SettingsResetOutfits(pc_settings *s) {
  int i;

  for (i=0;i<SETTINGS_PLAYER_COUNT;i++)
    s->outfits[i] = SettingsDefaultOutfit(i);
}

/* restore the default settings */
void SettingsReset(pc_settings *s) {
  s->skip_loading_screen = 0;
  s->loading_screen_min_ms = 1000;
  s->speed_display = 0;
  s->fps_display = 1;
  s->spin_display = 0;
  s->box_display = 1;
  s->skip_splash_screens = 1;
  s->fix_model_draw_order = 1;
  s->spin_ledge_jump = 1;
  s->replay_inputs = 0;
  s->replay_speed = 1;
  s->frame_rate = 60;
  s->fullscreen = 0;
  s->memory_card = 0;
  s->mute = 0;
  s->two_players = 0;
  SettingsResetOutfits(s);
  s->boot_level[0] = 0;
}

/*
 * parse a level name (letters, digits, _ and -, so it can't leave the
 * levels folder) into name; returns 0 if it isn't one
 */
static int SettingsParseLevelName(const char *value, char *name) {
  const char *c;

  if (*value == 0 || strlen(value) > SETTINGS_BOOT_LEVEL_MAX) { return 0; }
  for (c = value; *c; c++) {
    if (!SDL_isalnum(*c) && *c != '_' && *c != '-') { return 0; }
  }
  strcpy(name, value);
  return 1;
}

/* parse "on"/"off" into flag; returns 0 for any other value */
static int SettingsParseOnOff(const char *value, int *flag) {
  if (SDL_strcasecmp(value, "on") == 0) { *flag = 1; return 1; }
  if (SDL_strcasecmp(value, "off") == 0) { *flag = 0; return 1; }
  return 0;
}

/* parse a whole number from 0 to max into num; returns 0 if it isn't one */
static int SettingsParseNumber(const char *value, uint32_t max, uint32_t *num) {
  uint32_t n;

  if (*value == 0) { return 0; }
  for (n=0;*value;value++) {
    if (*value < '0' || *value > '9') { return 0; }
    n = (n*10) + (*value - '0');
    if (n > max) { return 0; }
  }
  *num = n;
  return 1;
}

/* parse a number from min to max into num; returns 0 if it isn't one */
static int SettingsParseNumberFrom(const char *value, uint32_t min, uint32_t max,
                                   uint32_t *num) {
  uint32_t n;

  if (!SettingsParseNumber(value, max, &n) || n < min) { return 0; }
  *num = n;
  return 1;
}

/* only for a digit SDL_isxdigit takes */
static uint32_t SettingsHexDigit(char digit) {
  if (SDL_isdigit(digit)) { return digit - '0'; }
  return SDL_tolower(digit) - 'a' + 10;
}

/* parse rrggbb into color; returns 0 for anything else */
static int SettingsParseColor(const char *value, uint32_t *color) {
  uint32_t parsed;
  int i;

  if (strlen(value) != SETTINGS_COLOR_DIGITS) { return 0; }
  parsed = 0;
  for (i=0;i<SETTINGS_COLOR_DIGITS;i++) {
    if (!SDL_isxdigit(value[i])) { return 0; }
    parsed = (parsed << 4) | SettingsHexDigit(value[i]);
  }
  *color = parsed;
  return 1;
}

uint32_t *SettingsColor(pc_settings *s, int color_idx) {
  const settings_color *color;

  color = &settings_colors[color_idx];
  return (uint32_t*)((char*)&s->outfits[color->player_idx] + color->offset);
}

uint32_t SettingsColorValue(const pc_settings *s, int color_idx) {
  const settings_color *color;

  color = &settings_colors[color_idx];
  return *(const uint32_t*)((const char*)&s->outfits[color->player_idx] + color->offset);
}

static uint32_t *SettingsColorNamed(const char *name, pc_settings *s) {
  int i;

  for (i=0;i<SETTINGS_COLOR_COUNT;i++) {
    if (SDL_strcasecmp(name, settings_colors[i].name) == 0) { return SettingsColor(s, i); }
  }
  return 0;
}

static int AppliedOrInvalid(int parsed) {
  if (parsed) { return 1; }
  return -1;
}

/* apply one setting; returns 1, or -1 if the name or value is invalid */
static int SettingsApply(const char *name, const char *value, pc_settings *s) {
  uint32_t *outfit_color;

  if (SDL_strcasecmp(name, "skip_loading_screen") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->skip_loading_screen));
  if (SDL_strcasecmp(name, "loading_screen_min_ms") == 0)
    return AppliedOrInvalid(SettingsParseNumber(value, SETTINGS_LOADING_SCREEN_MAX_MS,
      &s->loading_screen_min_ms));
  if (SDL_strcasecmp(name, "speed_display") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->speed_display));
  if (SDL_strcasecmp(name, "fps_display") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->fps_display));
  if (SDL_strcasecmp(name, "spin_display") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->spin_display));
  if (SDL_strcasecmp(name, "box_display") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->box_display));
  if (SDL_strcasecmp(name, "skip_splash_screens") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->skip_splash_screens));
  if (SDL_strcasecmp(name, "fix_model_draw_order") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->fix_model_draw_order));
  if (SDL_strcasecmp(name, "spin_ledge_jump") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->spin_ledge_jump));
  if (SDL_strcasecmp(name, "replay_inputs") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->replay_inputs));
  if (SDL_strcasecmp(name, "replay_speed") == 0)
    return AppliedOrInvalid(SettingsParseNumber(value, SETTINGS_REPLAY_SPEED_MAX,
      &s->replay_speed));
  if (SDL_strcasecmp(name, "frame_rate") == 0)
    return AppliedOrInvalid(SettingsParseNumberFrom(value, SETTINGS_FRAME_RATE_MIN,
      SETTINGS_FRAME_RATE_MAX, &s->frame_rate));
  if (SDL_strcasecmp(name, "fullscreen") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->fullscreen));
  if (SDL_strcasecmp(name, "memory_card") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->memory_card));
  if (SDL_strcasecmp(name, "mute") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->mute));
  if (SDL_strcasecmp(name, "two_players") == 0)
    return AppliedOrInvalid(SettingsParseOnOff(value, &s->two_players));
  if (SDL_strcasecmp(name, "boot_level") == 0)
    return AppliedOrInvalid(SettingsParseLevelName(value, s->boot_level));
  outfit_color = SettingsColorNamed(name, s);
  if (outfit_color)
    return AppliedOrInvalid(SettingsParseColor(value, outfit_color));
  return -1;
}

/*
 * parse one line of a settings file, in the form "name = value", into s.
 * returns 1 if a setting was applied, 0 for a blank or comment line,
 * and -1 for an invalid line (s is left unchanged).
 */
int SettingsParseLine(const char *line, pc_settings *s) {
  char buf[128], *name, *value;
  int res;

  res = ConfigParseLine(line, buf, sizeof(buf), &name, &value);
  if (res != 1) { return res; }
  return SettingsApply(name, value, s);
}

/* apply one settings file line to game_settings (ConfigLoad handler) */
static int SettingsApplyLine(char *name, char *value, const char *path,
  int line_num, void *data) {
  return SettingsApply(name, value, &game_settings);
}

/*
 * load game_settings from a settings file. settings it doesn't list keep
 * their defaults, and invalid lines are reported and skipped.
 * returns the number of settings applied, or -1 if the file can't be opened.
 */
int SettingsLoad(const char *path) {
  return ConfigLoad(path, "setting", "name = value", SettingsApplyLine, 0);
}

/* how a replay is watched doesn't change how it plays out, so that stays the player's own */
static void SettingsKeepOwnViewing(pc_settings *s, const pc_settings *own) {
  s->replay_inputs = own->replay_inputs;
  s->replay_speed = own->replay_speed;
  s->frame_rate = own->frame_rate;
  s->fullscreen = own->fullscreen;
  s->mute = own->mute;
  s->fps_display = own->fps_display;
  s->speed_display = own->speed_display;
  s->spin_display = own->spin_display;
  s->box_display = own->box_display;
}

/* so a replay plays out the same; 0, leaving game_settings as they were, if path can't be read */
int SettingsLoadRecorded(const char *path) {
  pc_settings own;

  own = game_settings;
  SettingsReset(&game_settings);
  if (SettingsLoad(path) < 0) {
    game_settings = own;
    return 0;
  }
  SettingsKeepOwnViewing(&game_settings, &own);
  return 1;
}
