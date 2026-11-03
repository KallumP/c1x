/*
 * the launcher's level editor section: checks node is installed, installs
 * the editor's packages, then starts the level editor
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "editor_section.h"
#include "command.h"
#include "node.h"
#include "level_editor.h"
#include "paths.h"
#include "ui.h"

#define NODE_DOWNLOAD_URL "https://nodejs.org/"
#define EDITOR_ADDRESS_MAX 64

static background_command node_check;
static int node_major_version; /* 0 if node wasn't found */
static background_command install;
static int packages_installed;
static background_command editor; /* npm run dev, which opens the editor in the browser */
static char editor_address[EDITOR_ADDRESS_MAX]; /* once it's running, or "" */

static void CheckNode(const char *repo) {
  node_major_version = 0;
  StartBackgroundCommand(&node_check, repo, "node --version");
}

static void UpdateNodeCheck(void) {
  if (UpdateBackgroundCommand(&node_check)) {
    node_major_version = NodeMajorVersion(node_check.output);
  }
}

static void DrawNodeProblem(const char *repo) {
  if (node_major_version) {
    igTextColored(PROBLEM_COLOUR, "The level editor needs Node.js %d or later, and this is %d.",
      NODE_MIN_MAJOR_VERSION, node_major_version);
  }
  else {
    igTextColored(PROBLEM_COLOUR, "The level editor needs Node.js %d or later, which isn't installed.",
      NODE_MIN_MAJOR_VERSION);
  }
  if (igButton("Get Node.js", (ImVec2){0, 0})) { SDL_OpenURL(NODE_DOWNLOAD_URL); }
  igSameLine(0, -1);
  if (igButton("Check again", (ImVec2){0, 0})) { CheckNode(repo); }
  igTextWrapped("Once it's installed, close and reopen the launcher if Check again doesn't find it.");
}

static void StartInstall(const char *repo) {
  char folder[PATH_MAX_LEN];

  LevelEditorFolder(repo, folder, sizeof(folder));
  StartBackgroundCommand(&install, folder, "npm install");
}

static void UpdateInstall(const char *repo) {
  if (UpdateBackgroundCommand(&install)) {
    /* a failed install can leave node_modules half there */
    packages_installed = install.exit_code == 0 && AreLevelEditorPackagesInstalled(repo);
  }
}

static void DrawInstall(const char *repo) {
  int running = IsBackgroundCommandRunning(&install);

  igTextWrapped("The level editor's packages aren't installed yet. "
    "Install downloads them with npm install, which takes a minute or two.");
  igBeginDisabled(running);
  if (igButton(running ? "Installing..." : "Install", (ImVec2){BUTTON_WIDTH, 0})) { StartInstall(repo); }
  igEndDisabled();
  if (!running && install.exit_code != 0) {
    igTextColored(PROBLEM_COLOUR, "Installing failed; its output says why.");
  }
  DrawCommandOutput("install_output", &install);
}

static void StartEditor(const char *repo) {
  char folder[PATH_MAX_LEN];

  editor_address[0] = 0;
  LevelEditorFolder(repo, folder, sizeof(folder));
  StartBackgroundCommand(&editor, folder, "npm run dev");
}

static void UpdateEditor(void) {
  UpdateBackgroundCommand(&editor);
  if (!editor_address[0] && IsBackgroundCommandRunning(&editor)) {
    FindLevelEditorAddress(editor.output, editor_address, sizeof(editor_address));
  }
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
  if (igButton("Stop", (ImVec2){BUTTON_WIDTH, 0})) {
    StopBackgroundCommand(&editor);
    editor.output[0] = 0; /* stopped on purpose, so nothing to explain */
    editor_address[0] = 0;
  }
}

static void DrawOpenEditor(const char *repo) {
  igTextWrapped("Places a level's spawn, end and boxes on its map, then builds it and boots the game into it.");
  if (igButton("Open editor", (ImVec2){BUTTON_WIDTH, 0})) { StartEditor(repo); }
  if (editor.output[0]) {
    igTextColored(PROBLEM_COLOUR, "The level editor stopped; its output says why.");
  }
}

static void DrawEditor(const char *repo) {
  if (IsBackgroundCommandRunning(&editor)) { DrawEditorRunning(); }
  else { DrawOpenEditor(repo); }
  DrawCommandOutput("editor_output", &editor);
}

void LoadEditorSection(const char *repo) {
  CheckNode(repo);
  packages_installed = AreLevelEditorPackagesInstalled(repo);
}

/* follow its commands, whether or not the section is showing */
void UpdateEditorSection(const char *repo) {
  UpdateNodeCheck();
  UpdateInstall(repo);
  UpdateEditor();
}

void DrawEditorSection(const char *repo) {
  if (IsBackgroundCommandRunning(&node_check)) {
    igText("Checking for Node.js...");
    return;
  }
  if (!IsNodeVersionSupported(node_major_version)) {
    DrawNodeProblem(repo);
    return;
  }
  if (!packages_installed) {
    DrawInstall(repo);
    return;
  }
  DrawEditor(repo);
}

void CloseEditorSection(void) {
  StopBackgroundCommand(&node_check);
  StopBackgroundCommand(&install);
  StopBackgroundCommand(&editor);
}
