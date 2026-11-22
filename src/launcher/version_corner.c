/*
 * the launcher's version, in the top right corner of its window, with a link
 * to the newest release's page if github has a newer one. it's checked once,
 * when the launcher opens, by c1x's tools (c1x_tools check-update); a build
 * that isn't a release has no version, and doesn't check
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "version_corner.h"
#include "command.h"
#include "newer_release.h"
#include "paths.h"
#include "tools.h"
#include "ui.h"
#include "version.h"

#define LINK_LABEL_MAX 64
#define LINK_TOOLTIP "Open its page on GitHub, to download it: " LATEST_RELEASE_PAGE

static background_command release_check;        /* c1x_tools check-update */
static char newer_version[RELEASE_VERSION_MAX]; /* "" until the check finds one */

static int HasNewerRelease(void) {
  return newer_version[0] != 0;
}

void StartReleaseCheck(const char *repo) {
  char command[PATH_MAX_LEN + 64];

  if (!AreToolsBuilt(repo)) { return; }
  /* no command for a dev build, which has no version to compare */
  if (!NewerReleaseCommand(repo, LauncherVersion(), command, sizeof(command))) { return; }
  StartBackgroundCommand(&release_check, repo, command);
}

void FollowReleaseCheck(void) {
  UpdateBackgroundCommand(&release_check);
  if (HasNewerRelease()) { return; }
  FindNewerRelease(release_check.output, newer_version, sizeof(newer_version));
}

void StopReleaseCheck(void) {
  StopBackgroundCommand(&release_check);
}

static float TextWidth(const char *text) {
  ImVec2 text_size;

  igCalcTextSize(&text_size, text, 0, false, -1.0f);
  return text_size.x;
}

/* a small button opening the newest release's page, and what's next beside it */
static void DrawNewerReleaseLink(const char *label) {
  if (igSmallButton(label)) { SDL_OpenURL(LATEST_RELEASE_PAGE); }
  DrawTooltip(LINK_TOOLTIP);
  igSameLine(0, -1);
}

/* right-aligned on the line the cursor is on. the cursor is put back after,
   so what's drawn next (the game section's heading) starts on the same line */
void DrawVersionCorner(void) {
  char version_label[VERSION_LABEL_MAX], link_label[LINK_LABEL_MAX];
  ImVec2 start, available;
  float width, indent;

  VersionLabel(LauncherVersion(), version_label, sizeof(version_label));
  width = TextWidth(version_label);
  if (HasNewerRelease()) {
    SDL_snprintf(link_label, sizeof(link_label), "Version %s is out", newer_version);
    width += ButtonWidth(link_label) + igGetStyle()->ItemSpacing.x;
  }
  igGetCursorPos(&start);
  igGetContentRegionAvail(&available);
  indent = SDL_max(0.0f, available.x - width); /* from the left in a window too narrow for it */
  igSetCursorPosX(start.x + indent);
  if (HasNewerRelease()) { DrawNewerReleaseLink(link_label); }
  igTextDisabled("%s", version_label);
  igSetCursorPos(start);
}
