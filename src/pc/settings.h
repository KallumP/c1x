#ifndef _PC_SETTINGS_H_
#define _PC_SETTINGS_H_

#include <stddef.h>
#include "common.h"
#include "outfit.h"

#define SETTINGS_LOADING_SCREEN_MAX_MS 60000
#define SETTINGS_REPLAY_SPEED_MAX      16
#define SETTINGS_BOOT_LEVEL_MAX        31
#define SETTINGS_FRAME_RATE_MIN        30 /* the game's own frame rate: nothing drawn between game frames */
#define SETTINGS_FRAME_RATE_MAX        240
#define SETTINGS_PLAYER_COUNT          2
#define SETTINGS_COLOR_DIGITS          6
#define SETTINGS_COLOR_COUNT           (SETTINGS_PLAYER_COUNT * 5) /* fur, belly, hair, shorts, shoes */
#define LEVELS_DIR "levels" /* next to the executable; built levels to boot into, by name */

/* game settings (pc), read from settings.cfg */
typedef struct {
  int skip_loading_screen;        /* don't show each level's loading screen */
  uint32_t loading_screen_min_ms; /* minimum time it is shown for */
  int speed_display;              /* show crash's speed in the top right */
  int fps_display;                /* show the frames drawn a second in the top right */
  int spin_display;               /* show how many spins crash has left in the top right */
  int box_display;                /* show a counter of the boxes broken with the hud */
  int skip_splash_screens;        /* boot straight to the main menu */
  int fix_model_draw_order;       /* depth test 3d models against each other */
  int spin_ledge_jump;            /* crash can jump just after a spin carries him off a ledge */
  int replay_inputs;              /* replay the newest recording instead of recording */
  uint32_t replay_speed;          /* times normal speed, 0 = as fast as possible */
  uint32_t frame_rate;            /* frames drawn a second; the game itself runs at the ps1's 29.97 */
  int fullscreen;                 /* fill the screen instead of a window */
  int memory_card;                /* the game's save and load screens save to files in memory_card/ */
  int mute;                       /* the game plays no sound */
  int two_players;                /* a second crash plays beside the first, on pad 2 */
  crash_outfit outfits[SETTINGS_PLAYER_COUNT]; /* the colours each player's crash is drawn in */
  char boot_level[SETTINGS_BOOT_LEVEL_MAX+1]; /* custom level to boot into, or "" */
} pc_settings;

/* a colour setting: its name, and which player's colour it sets */
typedef struct {
  const char *name;
  int player_idx;
  size_t offset; /* in crash_outfit */
} settings_color;

extern pc_settings game_settings;
extern const settings_color settings_colors[SETTINGS_COLOR_COUNT];


extern crash_outfit SettingsDefaultOutfit(int player_idx);
extern uint32_t *SettingsColor(pc_settings *s, int color_idx);
extern uint32_t SettingsColorValue(const pc_settings *s, int color_idx);
extern void SettingsReset(pc_settings *s);
extern int SettingsParseLine(const char *line, pc_settings *s);
extern int SettingsLoad(const char *path);
extern int SettingsCopyFile(const char *from, const char *to);
extern int SettingsLoadRecorded(const char *path);

#endif /* _PC_SETTINGS_H_ */
