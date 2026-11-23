/*
 * the launcher's levels tab: every custom level, built or not, each with a
 * Build button running build-level in the background, so a level source
 * dropped into level_src/ builds without node or the level editor, and a
 * View level button opening the page of one downloaded from mod.io
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "levels_section.h"
#include "level_build.h"
#include "tools.h"
#include "levels.h"
#include "help.h"
#include "online_levels_section.h"
#include "command.h"
#include "paths.h"
#include "settings_section.h"
#include "ui.h"

#define STATUS_WIDTH 90.0f

static custom_levels levels;
static background_command build;
static char building[SETTINGS_BOOT_LEVEL_MAX+1]; /* the level last built */
static char problem[PATH_MAX_LEN + 64];          /* why it couldn't start, or "" */

void LoadLevelsSection(const char *repo) {
  ListCustomLevels(repo, &levels);
}

void StartLevelBuild(const char *repo, const char *level) {
  char command[PATH_MAX_LEN + 64];
  int has_command;

  SDL_strlcpy(building, level, sizeof(building));
  has_command = BuildLevelCommand(repo, level, command, sizeof(command));
  StartToolsCommand(&build, repo, has_command, command, problem, sizeof(problem));
}

int IsLevelBuilding(void) {
  return IsBackgroundCommandRunning(&build);
}

int CanBuildLevels(const char *repo) {
  return AreToolsBuilt(repo) && !IsLevelBuilding();
}

/* once a build finishes, the levels it made are listed here and for
   boot_level, and a level that built is the one the title screen's CUSTOM LEVEL starts */
void UpdateLevelsSection(const char *repo) {
  if (!UpdateBackgroundCommand(&build)) { return; }
  LoadLevelsSection(repo);
  ListSettingsLevels(repo);
  if (build.exit_code == 0) { BootIntoLevel(repo, building); }
}

static void DrawToolsMissing(const char *repo) {
  char path[PATH_MAX_LEN];

  ToolsPath(repo, path, sizeof(path));
  igTextColored(PROBLEM_COLOUR, "Levels can't be built: there's no %s.", path);
  igTextWrapped("Build it with make, which needs Node.js (see doc/building.md).");
}

/* a button opening the level's page on mod.io, if it was downloaded from there */
static void DrawModioPageButton(int index) {
  if (!levels.modio_pages[index][0]) { return; }
  if (igButton(VIEW_LEVEL_PAGE, (ImVec2){ButtonWidth(VIEW_LEVEL_PAGE), 0})) {
    SDL_OpenURL(levels.modio_pages[index]);
  }
  DrawTooltip("Open the page it was downloaded from.");
}

static void DrawLevelRow(const char *repo, int index, int can_build) {
  igTableNextRow(0, 0);
  igTableNextColumn();
  igAlignTextToFramePadding();
  igText("%s", levels.titles[index]);
  igTableNextColumn();
  igText("%s", CustomLevelStatus(&levels, index));
  igTableNextColumn();
  igPushID_Int(index);
  DrawModioPageButton(index);
  igTableNextColumn();
  igBeginDisabled(!can_build);
  if (igButton("Build", (ImVec2){BUTTON_WIDTH, 0})) { StartLevelBuild(repo, levels.names[index]); }
  igEndDisabled();
  igPopID();
}

static void DrawLevelTable(const char *repo, int can_build) {
  ImGuiTableFlags flags;
  float page_width;
  int i;

  flags = ImGuiTableFlags_SizingFixedFit;
  page_width = ButtonWidth(VIEW_LEVEL_PAGE);
  if (!igBeginTable("custom_levels", 4, flags, (ImVec2){0, 0}, 0)) { return; }
  igTableSetupColumn("name", ImGuiTableColumnFlags_WidthStretch, 0, 0);
  igTableSetupColumn("status", ImGuiTableColumnFlags_WidthFixed, STATUS_WIDTH, 0);
  igTableSetupColumn("page", ImGuiTableColumnFlags_WidthFixed, page_width, 0);
  igTableSetupColumn("build", ImGuiTableColumnFlags_WidthFixed, BUTTON_WIDTH, 0);
  for (i = 0; i < levels.count; i++) {
    if (StartsLevelKind(&levels, i)) {
      DrawFieldGroupTitle(LevelKindTitle(levels.kinds[i]));
    }
    DrawLevelRow(repo, i, can_build);
  }
  igEndTable();
}

/* opens level_src/ in the file browser, to drop a downloaded level into */
static void DrawOpenLevelsFolderButton(const char *repo) {
  char url[FILE_URL_MAX];

  if (!igButton("Open levels folder", (ImVec2){0, 0})) { return; }
  LevelSourcesFolderUrl(repo, url, sizeof(url));
  SDL_OpenURL(url);
}

/* how the last build went, in a line */
void DrawLevelBuildStatus(void) {
  if (problem[0]) {
    igTextColored(PROBLEM_COLOUR, "%s", problem);
  } else if (IsBackgroundCommandRunning(&build)) {
    igText("Building %s...", building);
  } else if (build.output[0] && build.exit_code != 0) {
    igTextColored(PROBLEM_COLOUR, "%s didn't build; the Levels tab's output says why.", building);
  } else if (build.output[0]) {
    igText("Built %s, and set it as the boot level.", building);
  }
}

void DrawLevelsSection(const char *repo) {
  int has_tools = AreToolsBuilt(repo);

  igTextWrapped("Custom levels: each level source in level_src/ (a folder with its map), "
    "and the levels built from them to build/levels/.");
  if (!has_tools) { DrawToolsMissing(repo); }
  if (levels.count == 0) {
    igText("There are no level sources in level_src/.");
  }
  DrawLevelTable(repo, CanBuildLevels(repo));
  if (igButton("Check again", (ImVec2){0, 0})) { LoadLevelsSection(repo); }
  DrawTooltip("Look for new level sources in level_src/, and ones saved since they were built.");
  igSameLine(0, -1);
  DrawOpenLevelsFolderButton(repo);
  igSpacing();
  DrawLevelBuildStatus();
  DrawCommandOutput("build_output", &build);
  igSpacing();
  DrawOnlineLevelsSection(repo);
}
