/*
 * the levels tab's levels shared on mod.io: listed by c1x's tools when asked,
 * each with a Download button that downloads it into level_src/ and builds it
 * (c1x_tools list-online-levels and download-level, in the background)
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "online_levels_section.h"
#include "command.h"
#include "levels_section.h"
#include "online_levels.h"
#include "paths.h"
#include "settings_section.h"
#include "tools.h"
#include "ui.h"

#define AUTHOR_WIDTH 140.0f

static background_command level_list;     /* c1x_tools list-online-levels */
static background_command level_download; /* c1x_tools download-level */
static online_levels found;
static char downloading[ONLINE_LEVEL_TEXT_MAX]; /* the level last downloaded */

static int IsBusy(void) {
  return IsBackgroundCommandRunning(&level_list) || IsBackgroundCommandRunning(&level_download);
}

static void StartLevelList(const char *repo) {
  char command[PATH_MAX_LEN + 64];

  if (!ListOnlineLevelsCommand(repo, command, sizeof(command))) { return; }
  found.count = 0;
  StartBackgroundCommand(&level_list, repo, command);
}

static void StartLevelDownload(const char *repo, int index) {
  char command[PATH_MAX_LEN + 64];

  if (!DownloadLevelCommand(repo, found.ids[index], command, sizeof(command))) { return; }
  SDL_strlcpy(downloading, found.names[index], sizeof(downloading));
  StartBackgroundCommand(&level_download, repo, command);
}

/* the levels the list has found so far; once a download finishes, the level
   it made is listed with the others, and for boot_level */
void UpdateOnlineLevelsSection(const char *repo) {
  int was_listing = IsBackgroundCommandRunning(&level_list);

  if (UpdateBackgroundCommand(&level_list) || was_listing) {
    FindOnlineLevels(level_list.output, &found);
  }
  if (UpdateBackgroundCommand(&level_download)) {
    LoadLevelsSection(repo);
    ListSettingsLevels(repo);
  }
}

void StopOnlineLevelsSection(void) {
  StopBackgroundCommand(&level_list);
  StopBackgroundCommand(&level_download);
}

static void DrawOnlineLevelRow(const char *repo, int index, int can_download) {
  igTableNextRow(0, 0);
  igTableNextColumn();
  igAlignTextToFramePadding();
  igText("%s", found.names[index]);
  igTableNextColumn();
  igTextDisabled("by %s", found.authors[index]);
  igTableNextColumn();
  igPushID_Int(index);
  igBeginDisabled(!can_download);
  if (igButton("Download", (ImVec2){BUTTON_WIDTH, 0})) { StartLevelDownload(repo, index); }
  igEndDisabled();
  igPopID();
}

static void DrawOnlineLevelTable(const char *repo) {
  int can_download = !IsBusy() && CanBuildLevels(repo);
  int i;

  if (!igBeginTable("online_levels", 3, ImGuiTableFlags_SizingFixedFit, (ImVec2){0, 0}, 0)) { return; }
  igTableSetupColumn("name", ImGuiTableColumnFlags_WidthStretch, 0, 0);
  igTableSetupColumn("author", ImGuiTableColumnFlags_WidthFixed, AUTHOR_WIDTH, 0);
  igTableSetupColumn("download", ImGuiTableColumnFlags_WidthFixed, BUTTON_WIDTH, 0);
  for (i = 0; i < found.count; i++) { DrawOnlineLevelRow(repo, i, can_download); }
  igEndTable();
}

/* how the list went, in a line, with its output if it failed */
static void DrawLevelListStatus(void) {
  if (IsBackgroundCommandRunning(&level_list)) {
    igText("Looking on mod.io...");
  } else if (level_list.output[0] && level_list.exit_code != 0) {
    igTextColored(PROBLEM_COLOUR, "Couldn't look on mod.io:");
    DrawCommandOutput("list_output", &level_list);
  } else if (level_list.output[0] && found.count == 0) {
    igText("No levels are on mod.io yet.");
  }
}

/* how the last download went, in a line, with its output while it runs or if it failed */
static void DrawLevelDownloadStatus(void) {
  if (!level_download.output[0]) { return; }
  if (IsBackgroundCommandRunning(&level_download)) {
    igText("Downloading %s...", downloading);
  } else if (level_download.exit_code != 0) {
    igTextColored(PROBLEM_COLOUR, "%s didn't download and build; the output says why.", downloading);
  } else {
    igText("Downloaded and built %s: it's in the list above.", downloading);
    return;
  }
  DrawCommandOutput("download_output", &level_download);
}

void DrawOnlineLevelsSection(const char *repo) {
  DrawHeading("Levels on mod.io");
  igTextWrapped("Levels other players have shared. Downloading one puts it in level_src/ and builds it.");
  igBeginDisabled(IsBusy() || !AreToolsBuilt(repo));
  if (igButton("Find levels", (ImVec2){0, 0})) { StartLevelList(repo); }
  igEndDisabled();
  DrawTooltip("List the levels on mod.io.");
  DrawLevelListStatus();
  DrawOnlineLevelTable(repo);
  DrawLevelDownloadStatus();
}
