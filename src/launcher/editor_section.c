/*
 * the launcher's level editor section: checks node is installed, then
 * starts the level editor
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "editor_section.h"
#include "command.h"
#include "node.h"
#include "ui.h"

#define NODE_DOWNLOAD_URL "https://nodejs.org/"

static background_command node_check;
static int node_major_version; /* 0 if node wasn't found */

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

void LoadEditorSection(const char *repo) {
  CheckNode(repo);
}

void DrawEditorSection(const char *repo) {
  igText("Level editor");
  igSeparator();
  UpdateNodeCheck();
  if (IsBackgroundCommandRunning(&node_check)) {
    igText("Checking for Node.js...");
    return;
  }
  if (!IsNodeVersionSupported(node_major_version)) {
    DrawNodeProblem(repo);
    return;
  }
  igText("Node.js %d is installed.", node_major_version);
}

void CloseEditorSection(void) {
  StopBackgroundCommand(&node_check);
}
