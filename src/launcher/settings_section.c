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
#include "levels_section.h"
#include "paths.h"

#define NUMBER_WIDTH 160.0f
#define SLIDER_WIDTH 320.0f
#define BOOT_LEVEL_WIDTH 240.0f
#define NO_BOOT_LEVEL "none"
#define CHANGE_CHECK_MS 500 /* how often to look for settings.cfg changing */

static pc_settings settings;
static pc_settings saved;     /* what settings.cfg had when last loaded or saved */
static Uint32 last_change_check;
static custom_levels levels;
static char save_status[PATH_MAX_LEN + 64]; /* what Save last did, or "" */
static int save_failed;

static void SettingsPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "settings.cfg");
}

/* read settings.cfg, creating it from settings.example.cfg if there isn't
   one, and list the custom levels */
void LoadSettingsSection(const char *repo) {
  char path[PATH_MAX_LEN];

  SettingsPath(repo, path, sizeof(path));
  if (!ReadSettingsFile(path, &settings)) { SaveSettingsSection(repo); } /* the defaults */
  saved = settings;
  ListSettingsLevels(repo);
  save_status[0] = 0;
}

void ListSettingsLevels(const char *repo) {
  ListCustomLevels(repo, &levels);
}

void BootIntoLevel(const char *repo, const char *level) {
  SDL_strlcpy(settings.boot_level, level, sizeof(settings.boot_level));
  SaveSettingsSection(repo);
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

/* a number box beside the setting drawn just before it, as part of it, greyed
   out when it doesn't apply; name tells it apart */
static void DrawNumberBeside(const char *name, uint32_t *setting, uint32_t step,
  uint32_t max, int applies, const char *tooltip) {
  uint32_t step_fast;

  igSameLine(0, -1);
  step_fast = step * 10;
  igSetNextItemWidth(NUMBER_WIDTH);
  igPushID_Str(name);
  igBeginDisabled(!applies);
  if (igInputScalar("##number", ImGuiDataType_U32, setting, &step, &step_fast, "%u", 0)) {
    if (*setting > max) { *setting = max; }
  }
  igEndDisabled();
  igPopID();
  DrawTooltip(tooltip);
}

/* a slider from min to max (ctrl+click to type a value, still kept in range),
   beside the setting drawn just before it, as part of it */
static void DrawSliderBeside(const char *name, uint32_t *setting, uint32_t min,
  uint32_t max, const char *tooltip) {
  igSameLine(0, -1);
  igSetNextItemWidth(SLIDER_WIDTH);
  igPushID_Str(name);
  igSliderScalar("##slider", ImGuiDataType_U32, setting, &min, &max, "%u",
    ImGuiSliderFlags_AlwaysClamp);
  igPopID();
  DrawTooltip(tooltip);
}

static int IsCustomLevelBuilt(const char *name) {
  int at = FindCustomLevel(&levels, name);

  return at >= 0 && levels.built[at];
}

static void DrawBootLevelChoice(const char *name, const char *level) {
  bool selected;

  selected = SDL_strcmp(settings.boot_level, level) == 0;
  if (igSelectable_Bool(name, selected, 0, (ImVec2){0,0})) {
    SDL_strlcpy(settings.boot_level, level, sizeof(settings.boot_level));
  }
  if (selected) { igSetItemDefaultFocus(); }
}

/* a level that isn't built builds when chosen, and is then the boot level */
static void DrawUnbuiltLevelChoice(const char *repo, const char *label, const char *level) {
  int can_build = CanBuildLevels(repo);

  igBeginDisabled(!can_build);
  if (igSelectable_Bool(label, false, 0, (ImVec2){0,0})) { StartLevelBuild(repo, level); }
  igEndDisabled();
}

static void DrawCustomLevelChoice(const char *repo, int index) {
  char label[SETTINGS_BOOT_LEVEL_MAX + 16];

  CustomLevelLabel(&levels, index, label, sizeof(label));
  if (levels.built[index]) {
    DrawBootLevelChoice(label, levels.names[index]);
  } else {
    DrawUnbuiltLevelChoice(repo, label, levels.names[index]);
  }
}

/* what the boot level dropdown shows for the current boot_level */
static void BootLevelPreview(char *preview, size_t size) {
  if (!settings.boot_level[0]) {
    SDL_strlcpy(preview, NO_BOOT_LEVEL, size);
  }
  else if (!IsCustomLevelBuilt(settings.boot_level)) {
    SDL_snprintf(preview, size, "%s (not built)", settings.boot_level);
  }
  else {
    SDL_strlcpy(preview, settings.boot_level, size);
  }
}

#define BOOT_LEVEL_TOOLTIP "The level that CUSTOM LEVEL on the game's title screen starts. Choosing one that isn't built builds it first."

static void DrawBootLevel(const char *repo) {
  char preview[64];
  int i;

  BeginFieldRow("Custom level", BOOT_LEVEL_TOOLTIP);
  BootLevelPreview(preview, sizeof(preview));
  igSetNextItemWidth(BOOT_LEVEL_WIDTH);
  if (igBeginCombo("##boot_level", preview, 0)) {
    DrawBootLevelChoice(NO_BOOT_LEVEL, "");
    for (i=0;i<levels.count;i++) { DrawCustomLevelChoice(repo, i); }
    igEndCombo();
  }
  DrawTooltip(BOOT_LEVEL_TOOLTIP);
  DrawLevelBuildStatus();
}

/* the window and what's shown over the game */
static void DrawDisplayFields(void) {
  DrawFieldGroupTitle("Display");
  DrawOnOff("Fullscreen", &settings.fullscreen,
    "Alt+Enter or F11 switches while playing.");
  DrawOnOff("FPS display", &settings.fps_display,
    "Shows an FPS counter in the top right corner.");
  DrawSliderBeside("frame_rate", &settings.frame_rate, SETTINGS_FRAME_RATE_MIN,
    SETTINGS_FRAME_RATE_MAX,
    "Target frame rate: frames drawn a second. The game logic still runs at 30 fps, so it plays the same.");
  DrawOnOff("Box counter", &settings.box_display,
    "Show the level's boxes count (eg 12/49) in the in-game hud");
}

/* changes to how the original game plays or looks */
static void DrawGameAdjustmentFields(void) {
  DrawFieldGroupTitle("Game adjustments");
  DrawOnOff("Skip splash screens", &settings.skip_splash_screens,
    "Go straight to the main menu when the game starts.");
  DrawOnOff("Skip loading screen", &settings.skip_loading_screen,
    "Don't show each level's loading screen while it loads.");
  DrawNumberBeside("loading_screen_min_ms", &settings.loading_screen_min_ms,
    100, SETTINGS_LOADING_SCREEN_MAX_MS, !settings.skip_loading_screen,
    "Minimum loading screen time (ms): keep the loading screen up for at least this long. 0 shows it only while loading.");
  DrawOnOff("Fix model draw order", &settings.fix_model_draw_order,
    "Draw 3D models in front of or behind each other by their actual depth.");
  DrawOnOff("Fix jumping while spinning off a ledge", &settings.spin_ledge_jump,
    "In the original, once a spin carries Crash off a ledge (such as one he landed on mid-spin), he can't jump until the spin ends. This lets him jump for a moment after leaving the ledge, as he can when walking off one.");
  DrawOnOff("Speed display", &settings.speed_display,
    "Show how fast Crash is moving in the top right corner.");
  DrawOnOff("Spin display", &settings.spin_display,
    "Show how many spins Crash has left in the top right corner.");
}

/* the game's own save and load screens */
static void DrawSavingFields(void) {
  DrawFieldGroupTitle("Saving");
  DrawOnOff("Memory card", &settings.memory_card,
    "Lets the game's own save and load screens save your progress, to files in the memory_card folder.");
}

static void DrawReplayFields(void) {
  DrawFieldGroupTitle("Replays");
  DrawOnOff("Replay inputs", &settings.replay_inputs,
    "Play back the newest recording in build/recorded_inputs/");
  DrawNumberBeside("replay_speed", &settings.replay_speed, 1, SETTINGS_REPLAY_SPEED_MAX,
    settings.replay_inputs, "Replay speed: how many times normal speed replays play at, or 0 for as fast as possible.");
}

static void DrawFields(const char *repo) {
  if (!BeginFieldRows("settings_fields")) { return; }
  DrawBootLevel(repo);
  DrawDisplayFields();
  DrawGameAdjustmentFields();
  DrawSavingFields();
  DrawReplayFields();
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
  DrawFields(repo);
  igSpacing();
  DrawButtons(repo);
}
