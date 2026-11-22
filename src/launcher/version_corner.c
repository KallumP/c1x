/*
 * the launcher's version, in the top right corner of its window, with a link
 * to a newer release's page if github has one. it's checked once, when the
 * launcher opens, by c1x's tools (c1x_tools check-update); a build that isn't
 * a release has no version, and doesn't check
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "version_corner.h"
#include "command.h"
#include "paths.h"
#include "tools.h"
#include "newer_release.h"
#include "version.h"

#define LINK_LABEL_MAX 64

static background_command check; /* c1x_tools check-update */
static char newer_version[RELEASE_VERSION_MAX]; /* "" until the check finds one */

void StartReleaseCheck(const char *repo) {
  char command[PATH_MAX_LEN + 64];

  if (!AreToolsBuilt(repo)) { return; }
  if (!NewerReleaseCommand(repo, LauncherVersion(), command, sizeof(command))) { return; }
  StartBackgroundCommand(&check, repo, command);
}

void FollowReleaseCheck(void) {
  UpdateBackgroundCommand(&check);
  if (newer_version[0]) { return; } /* found already */
  FindNewerRelease(check.output, newer_version, sizeof(newer_version));
}

void StopReleaseCheck(void) {
  StopBackgroundCommand(&check);
}

static float TextWidth(const char *text) {
  ImVec2 text_size;

  igCalcTextSize(&text_size, text, 0, false, -1.0f);
  return text_size.x;
}

/* the link to the newer release, a small button, and the gap after it */
static float LinkWidth(const char *label) {
  ImGuiStyle *style = igGetStyle();

  return TextWidth(label) + style->FramePadding.x * 2 + style->ItemSpacing.x;
}

/* drawn over the right of the line the cursor is on, which is left where it was */
void DrawVersionCorner(void) {
  char version[VERSION_LABEL_MAX], link[LINK_LABEL_MAX];
  ImVec2 start, space;
  float width;

  VersionLabel(LauncherVersion(), version, sizeof(version));
  SDL_snprintf(link, sizeof(link), "Version %s is out", newer_version);
  igGetCursorPos(&start);
  igGetContentRegionAvail(&space);
  width = TextWidth(version) + (newer_version[0] ? LinkWidth(link) : 0);
  igSetCursorPosX(start.x + space.x - width);
  if (newer_version[0]) {
    if (igSmallButton(link)) { SDL_OpenURL(LATEST_RELEASE_PAGE); }
    if (igIsItemHovered(0)) { igSetTooltip("Open its page on GitHub, to download it:\n%s", LATEST_RELEASE_PAGE); }
    igSameLine(0, -1);
  }
  igTextDisabled("%s", version);
  igSetCursorPos(start);
}
