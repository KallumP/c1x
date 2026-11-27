#ifndef _PC_SETTINGS_H_
#define _PC_SETTINGS_H_

#include "common.h"

#define SETTINGS_LOADING_SCREEN_MAX_MS 60000
#define SETTINGS_REPLAY_SPEED_MAX      16
#define SETTINGS_BOOT_LEVEL_MAX        31
#define SETTINGS_FRAME_RATE_MIN        30 /* the game's own frame rate: nothing drawn between game frames */
#define SETTINGS_FRAME_RATE_MAX        240
#define SETTINGS_PLAYER_COUNT          2
#define SETTINGS_COLOR_DIGITS          6
#define SETTINGS_FUR_COLOR             0xFF3100 /* crash's own colours, as 0xRRGGBB */
#define SETTINGS_SHORTS_COLOR          0x002790
#define SETTINGS_SHOES_COLOR           0x330000
#define SETTINGS_BELLY_COLOR           0xFF7600
#define SETTINGS_HAIR_COLOR            0x9D0000
#define SETTINGS_P2_FUR_COLOR          0x33333A /* what player two starts in, a skunk: black fur, purple shorts, dark grey shoes */
#define SETTINGS_P2_SHORTS_COLOR       0x7A3E9D
#define SETTINGS_P2_SHOES_COLOR        0x2D2D2D
#define SETTINGS_P2_BELLY_COLOR        0xF0F0F0 /* his stripe */
#define SETTINGS_P2_HAIR_COLOR         0xF0F0F0
#define LEVELS_DIR "levels" /* next to the executable; built levels to boot into, by name */

/* the colours a player's crash is drawn in, each 0xRRGGBB (see pc/outfit.h) */
typedef struct {
  uint32_t fur;
  uint32_t shorts;
  uint32_t shoes; /* and his gloves */
  uint32_t belly; /* and the patch on his back, and his muzzle, paler */
  uint32_t hair;
} crash_outfit;

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

extern pc_settings game_settings;

extern crash_outfit SettingsDefaultOutfit(int player_idx);
extern void SettingsReset(pc_settings *s);
extern int SettingsParseLine(const char *line, pc_settings *s);
extern int SettingsLoad(const char *path);

#endif /* _PC_SETTINGS_H_ */
