/*
 * the launcher's settings section: a field for each setting in
 * settings.cfg (see doc/settings.md), and Save. it reloads settings.cfg when
 * something else changes it, such as the level editor's Boot button
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "settings_section.h"
#include "ui.h"
#include "settings_file.h"
#include "levels.h"
#include "paths.h"

#define NUMBER_WIDTH 160.0f
#define SLIDER_WIDTH 320.0f
#define BOOT_LEVEL_WIDTH 240.0f
#define TITLE_SCREEN "title screen"
#define CHANGE_CHECK_MS 500 /* how often to look for settings.cfg changing */

static pc_settings settings;
static pc_settings saved;     /* what settings.cfg had when last loaded or saved */
static Uint32 last_change_check;
static built_levels levels;
static char save_status[PATH_MAX_LEN + 64]; /* what Save last did, or "" */
static int save_failed;

static void SettingsPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "settings.cfg");
}

/* read settings.cfg, creating it from settings.example.cfg if there isn't
   one, and list the levels built to build/levels/ */
void LoadSettingsSection(const char *repo) {
  char path[PATH_MAX_LEN];

  SettingsPath(repo, path, sizeof(path));
  if (!ReadSettingsFile(path, &settings)) { SaveSettingsSection(repo); } /* the defaults */
  saved = settings;
  JoinPath(path, sizeof(path), repo, "build/levels");
  ListBuiltLevels(path, &levels);
  save_status[0] = 0;
}

/* write the settings to settings.cfg; returns 0 (saying why) if it can't */
int SaveSettingsSection(const char *repo) {
  char path[PATH_MAX_LEN], example_path[PATH_MAX_LEN];

  SettingsPath(repo, path, sizeof(path));
  JoinPath(example_path, sizeof(example_path), repo, "settings.example.cfg");
  save_failed = !SaveSettingsFile(path, example_path, &settings);
  if (!save_failed) { saved = settings; }
  SDL_snprintf(save_status, sizeof(save_status),
    save_failed ? "Couldn't save %s." : "Saved %s.", path);
  return !save_failed;
}

static int HasUnsavedChanges(void) {
  return !AreSettingsEqual(&settings, &saved);
}

/* reload settings.cfg if something else changed it, unless that would lose
   changes made here (Play or Save then writes those over it) */
void UpdateSettingsSection(const char *repo) {
  char path[PATH_MAX_LEN];
  pc_settings on_disk;

  if (SDL_GetTicks() - last_change_check < CHANGE_CHECK_MS) { return; }
  last_change_check = SDL_GetTicks();
  if (HasUnsavedChanges()) { return; }
  SettingsPath(repo, path, sizeof(path));
  ReadSettingsFile(path, &on_disk);
  if (!AreSettingsEqual(&on_disk, &saved)) { LoadSettingsSection(repo); }
}

static void DrawOnOff(const char *label, int *setting, const char *tooltip) {
  bool on;

  BeginFieldRow(label, tooltip);
  on = *setting != 0;
  igPushID_Str(label);
  if (igCheckbox("##on", &on)) { *setting = on; }
  igPopID();
  DrawTooltip(tooltip);
}

static void DrawNumber(const char *label, uint32_t *setting, uint32_t step,
  uint32_t max, const char *tooltip) {
  uint32_t step_fast;

  BeginFieldRow(label, tooltip);
  step_fast = step * 10;
  igSetNextItemWidth(NUMBER_WIDTH);
  igPushID_Str(label);
  if (igInputScalar("##number", ImGuiDataType_U32, setting, &step, &step_fast, "%u", 0)) {
    if (*setting > max) { *setting = max; }
  }
  igPopID();
  DrawTooltip(tooltip);
}

/* a slider from min to max (ctrl+click to type a value, still kept in range) */
static void DrawSlider(const char *label, uint32_t *setting, uint32_t min,
  uint32_t max, const char *tooltip) {
  BeginFieldRow(label, tooltip);
  igSetNextItemWidth(SLIDER_WIDTH);
  igPushID_Str(label);
  igSliderScalar("##slider", ImGuiDataType_U32, setting, &min, &max, "%u",
    ImGuiSliderFlags_AlwaysClamp);
  igPopID();
  DrawTooltip(tooltip);
}

static void DrawBootLevelChoice(const char *name, const char *level) {
  bool selected;

  selected = SDL_strcmp(settings.boot_level, level) == 0;
  if (igSelectable_Bool(name, selected, 0, (ImVec2){0,0})) {
    SDL_strlcpy(settings.boot_level, level, sizeof(settings.boot_level));
  }
  if (selected) { igSetItemDefaultFocus(); }
}

/* what the boot level dropdown shows for the current boot_level */
static void BootLevelPreview(char *preview, size_t size) {
  if (!settings.boot_level[0]) {
    SDL_strlcpy(preview, TITLE_SCREEN, size);
  }
  else if (FindBuiltLevel(&levels, settings.boot_level) < 0) {
    SDL_snprintf(preview, size, "%s (not built)", settings.boot_level);
  }
  else {
    SDL_strlcpy(preview, settings.boot_level, size);
  }
}

#define BOOT_LEVEL_TOOLTIP "Start in a level built to build/levels/ instead of the title screen."

static void DrawBootLevel() {
  char preview[64];
  int i;

  BeginFieldRow("Boot level", BOOT_LEVEL_TOOLTIP);
  BootLevelPreview(preview, sizeof(preview));
  igSetNextItemWidth(BOOT_LEVEL_WIDTH);
  if (igBeginCombo("##boot_level", preview, 0)) {
    DrawBootLevelChoice(TITLE_SCREEN, "");
    for (i=0;i<levels.count;i++) {
      DrawBootLevelChoice(levels.names[i], levels.names[i]);
    }
    igEndCombo();
  }
  DrawTooltip(BOOT_LEVEL_TOOLTIP);
}

static void DrawFields() {
  if (!BeginFieldRows("settings_fields")) { return; }
  DrawOnOff("Loading screen", &settings.loading_screen,
    "Show each level's loading screen while it loads.");
  DrawNumber("Minimum loading screen time (ms)", &settings.loading_screen_min_ms,
    100, SETTINGS_LOADING_SCREEN_MAX_MS,
    "Keep the loading screen up for at least this long. 0 shows it only while loading.");
  DrawOnOff("Speed display", &settings.speed_display,
    "Show how fast Crash is moving in the top right corner.");
  DrawOnOff("Skip splash screens", &settings.skip_splash_screens,
    "Go straight to the main menu when the game starts.");
  DrawOnOff("Fix model draw order", &settings.fix_model_draw_order,
    "Draw 3D models in front of or behind each other by their actual depth.");
  DrawOnOff("Replay inputs", &settings.replay_inputs,
    "Play back the newest recording in build/recorded_inputs/ instead of recording.");
  DrawNumber("Replay speed", &settings.replay_speed, 1, SETTINGS_REPLAY_SPEED_MAX,
    "How many times normal speed replays play at, or 0 for as fast as possible.");
  DrawSlider("Frame rate", &settings.frame_rate, SETTINGS_FRAME_RATE_MIN,
    SETTINGS_FRAME_RATE_MAX,
    "Frames drawn a second. The game logic still runs at 30 fps, so it plays the same.");
  DrawOnOff("FPS display", &settings.fps_display,
    "Show how many frames are drawn a second in the top right corner.");
  DrawOnOff("Spin display", &settings.spin_display,
    "Show how many spins Crash has left in the top right corner.");
  DrawBootLevel();
  EndFieldRows();
}

static void DrawButtons(const char *repo) {
  if (igButton("Save", (ImVec2){BUTTON_WIDTH, 0})) { SaveSettingsSection(repo); }
  igSameLine(0, -1);
  if (igButton("Reload", (ImVec2){BUTTON_WIDTH, 0})) { LoadSettingsSection(repo); }
  DrawTooltip("Read settings.cfg again, and look for newly built levels.");
  if (!save_status[0]) { return; }
  if (save_failed) { igTextColored(PROBLEM_COLOUR, "%s", save_status); }
  else { igText("%s", save_status); }
}

void DrawSettingsSection(const char *repo) {
  DrawFields();
  igSpacing();
  DrawButtons(repo);
}
