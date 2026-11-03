/*
 * the launcher's settings section: a field for each setting in
 * settings.cfg (see doc/settings.md), and Save
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "settings_section.h"
#include "settings_file.h"
#include "levels.h"
#include "paths.h"

#define PROBLEM_COLOUR ((ImVec4){1.0f, 0.45f, 0.4f, 1.0f})
#define FIELD_WIDTH 200.0f
#define TITLE_SCREEN "title screen"

static pc_settings settings;
static built_levels levels;
static char save_status[PATH_MAX_LEN + 64]; /* what Save last did, or "" */
static int save_failed;

static void SettingsPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "settings.cfg");
}

/* read settings.cfg, and list the levels built to build/levels/ */
void LoadSettingsSection(const char *repo) {
  char path[PATH_MAX_LEN];

  SettingsPath(repo, path, sizeof(path));
  ReadSettingsFile(path, &settings);
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
  SDL_snprintf(save_status, sizeof(save_status),
    save_failed ? "Couldn't save %s." : "Saved %s.", path);
  return !save_failed;
}

static void DrawTooltip(const char *text) {
  if (igIsItemHovered(0)) { igSetTooltip("%s", text); }
}

static void DrawOnOff(const char *label, int *setting, const char *tooltip) {
  bool on;

  on = *setting != 0;
  if (igCheckbox(label, &on)) { *setting = on; }
  DrawTooltip(tooltip);
}

static void DrawNumber(const char *label, uint32_t *setting, uint32_t step,
  uint32_t max, const char *tooltip) {
  uint32_t step_fast;

  step_fast = step * 10;
  igPushItemWidth(FIELD_WIDTH);
  if (igInputScalar(label, ImGuiDataType_U32, setting, &step, &step_fast, "%u", 0)) {
    if (*setting > max) { *setting = max; }
  }
  igPopItemWidth();
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

static void DrawBootLevel() {
  char preview[64];
  int i;

  BootLevelPreview(preview, sizeof(preview));
  igPushItemWidth(FIELD_WIDTH);
  if (igBeginCombo("Boot level", preview, 0)) {
    DrawBootLevelChoice(TITLE_SCREEN, "");
    for (i=0;i<levels.count;i++) {
      DrawBootLevelChoice(levels.names[i], levels.names[i]);
    }
    igEndCombo();
  }
  igPopItemWidth();
  DrawTooltip("Start in a level built to build/levels/ instead of the title screen.");
}

static void DrawFields() {
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
  DrawBootLevel();
}

static void DrawButtons(const char *repo) {
  if (igButton("Save", (ImVec2){120, 0})) { SaveSettingsSection(repo); }
  igSameLine(0, -1);
  if (igButton("Reload", (ImVec2){120, 0})) { LoadSettingsSection(repo); }
  DrawTooltip("Read settings.cfg again, and look for newly built levels.");
  if (!save_status[0]) { return; }
  if (save_failed) { igTextColored(PROBLEM_COLOUR, "%s", save_status); }
  else { igText("%s", save_status); }
}

void DrawSettingsSection(const char *repo) {
  igText("Settings");
  igSeparator();
  DrawFields();
  igSpacing();
  DrawButtons(repo);
}
