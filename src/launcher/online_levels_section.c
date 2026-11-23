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
#define COMMAND_MAX (PATH_MAX_LEN + 64)

static background_command level_list;     /* c1x_tools list-online-levels */
static background_command level_download; /* c1x_tools download-level */
static online_levels found;
static char download_name[ONLINE_LEVEL_TEXT_MAX];
static char problem[COMMAND_MAX + 32]; /* why a list or download couldn't start, or "" */

static int IsListingOrDownloading(void) {
  return IsBackgroundCommandRunning(&level_list)
    || IsBackgroundCommandRunning(&level_download);
}

static void StartLevelList(const char *repo) {
  char command[COMMAND_MAX];
  int has_command;

  has_command = ListOnlineLevelsCommand(repo, command, sizeof(command));
  if (StartToolsCommand(&level_list, repo, has_command, command, problem,
    sizeof(problem))) {
    found.count = 0;
  }
}

static void StartLevelDownload(const char *repo, int index) {
  char command[COMMAND_MAX];
  int has_command;

  has_command = DownloadLevelCommand(repo, found.ids[index], command, sizeof(command));
  if (StartToolsCommand(&level_download, repo, has_command, command, problem,
    sizeof(problem))) {
    SDL_strlcpy(download_name, found.names[index], sizeof(download_name));
  }
}

/* the levels the list has found so far; once a download finishes, the level
   it made is listed with the others, and for boot_level */
void UpdateOnlineLevelsSection(const char *repo) {
  int was_listing;

  was_listing = IsBackgroundCommandRunning(&level_list);
  UpdateBackgroundCommand(&level_list);
  if (was_listing) {
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
  if (igButton("Download", (ImVec2){BUTTON_WIDTH, 0})) {
    StartLevelDownload(repo, index);
  }
  igEndDisabled();
  igPopID();
}

static void DrawOnlineLevelTable(const char *repo) {
  ImGuiTableFlags flags;
  int can_download, i;

  can_download = !IsListingOrDownloading() && CanBuildLevels(repo);
  flags = ImGuiTableFlags_SizingFixedFit;
  if (!igBeginTable("online_levels", 3, flags, (ImVec2){0, 0}, 0)) { return; }
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

static int DidDownloadWork(void) {
  return !IsBackgroundCommandRunning(&level_download) && level_download.exit_code == 0;
}

/* how the last download went, in a line, with its output while it runs or if it failed */
static void DrawLevelDownloadStatus(void) {
  if (!level_download.output[0]) { return; }
  if (DidDownloadWork()) {
    igText("Downloaded and built %s: it's in the list above.", download_name);
    return;
  }
  if (IsBackgroundCommandRunning(&level_download)) {
    igText("Downloading %s...", download_name);
  } else {
    igTextColored(PROBLEM_COLOUR, "%s didn't download and build; the output says why.",
      download_name);
  }
  DrawCommandOutput("download_output", &level_download);
}

void DrawOnlineLevelsSection(const char *repo) {
  DrawHeading("Levels on mod.io");
  igTextWrapped("Levels other players have shared. "
    "Downloading one puts it in level_src/ and builds it.");
  igBeginDisabled(IsListingOrDownloading() || !AreToolsBuilt(repo));
  if (igButton("Find levels", (ImVec2){0, 0})) { StartLevelList(repo); }
  igEndDisabled();
  DrawTooltip("List the levels on mod.io.");
  if (problem[0]) { igTextColored(PROBLEM_COLOUR, "%s", problem); }
  DrawLevelListStatus();
  DrawOnlineLevelTable(repo);
  DrawLevelDownloadStatus();
}
