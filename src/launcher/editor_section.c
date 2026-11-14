/*
 * the launcher's level editor section: starts the level editor from c1x's
 * tools (c1x_tools editor), which need nothing installed, and opens it in
 * the browser once it says where it's running
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "editor_section.h"
#include "command.h"
#include "level_editor.h"
#include "paths.h"
#include "tools.h"
#include "ui.h"

#define EDITOR_ADDRESS_MAX 64

static background_command editor; /* c1x_tools editor, which serves the editor */
static char editor_address[EDITOR_ADDRESS_MAX]; /* once it's running, or "" */
static char problem[PATH_MAX_LEN + 64];         /* why it couldn't start, or "" */

static void StartEditor(const char *repo) {
  char command[PATH_MAX_LEN + 32];

  editor_address[0] = 0;
  problem[0] = 0;
  if (!LevelEditorCommand(repo, command, sizeof(command))) {
    SDL_snprintf(problem, sizeof(problem), "Couldn't run the level editor from %s.", repo);
    return;
  }
  if (!StartBackgroundCommand(&editor, repo, command)) {
    SDL_snprintf(problem, sizeof(problem), "Couldn't run %s.", command);
  }
}

/* opens the editor in the browser the first time it says where it is */
static void UpdateEditor(void) {
  UpdateBackgroundCommand(&editor);
  if (editor_address[0] || !IsBackgroundCommandRunning(&editor)) { return; }
  if (FindLevelEditorAddress(editor.output, editor_address, sizeof(editor_address))) {
    SDL_OpenURL(editor_address);
  }
}

static void StopEditor(void) {
  StopBackgroundCommand(&editor);
  editor.output[0] = 0; /* stopped on purpose, so nothing to explain */
  editor_address[0] = 0;
}

static void DrawEditorRunning(void) {
  if (editor_address[0]) {
    igText("The level editor is running at %s", editor_address);
    if (igButton("Open in browser", (ImVec2){0, 0})) { SDL_OpenURL(editor_address); }
    igSameLine(0, -1);
  }
  else {
    igText("Starting the level editor...");
  }
  if (igButton("Stop", (ImVec2){BUTTON_WIDTH, 0})) { StopEditor(); }
}

static void DrawOpenEditor(const char *repo) {
  igTextWrapped("Places a level's spawn, end and boxes on its map, then builds it and boots the game into it.");
  if (igButton("Open editor", (ImVec2){BUTTON_WIDTH, 0})) { StartEditor(repo); }
  if (problem[0]) {
    igTextColored(PROBLEM_COLOUR, "%s", problem);
  }
  else if (editor.output[0]) {
    igTextColored(PROBLEM_COLOUR, "The level editor stopped; its output says why.");
  }
}

static void DrawToolsMissing(const char *repo) {
  char path[PATH_MAX_LEN];

  ToolsPath(repo, path, sizeof(path));
  igTextColored(PROBLEM_COLOUR, "The level editor can't run: there's no %s.", path);
  igTextWrapped("Build it with make, which needs Node.js (see doc/building.md).");
}

/* follow the editor, whether or not the section is showing */
void UpdateEditorSection(void) {
  UpdateEditor();
}

void DrawEditorSection(const char *repo) {
  if (IsBackgroundCommandRunning(&editor)) {
    DrawEditorRunning();
  }
  else if (!AreToolsBuilt(repo)) {
    DrawToolsMissing(repo);
  }
  else {
    DrawOpenEditor(repo);
  }
  DrawCommandOutput("editor_output", &editor);
}

void CloseEditorSection(void) {
  StopBackgroundCommand(&editor);
}
