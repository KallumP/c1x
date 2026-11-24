/*
 * the launcher's version, in the top right corner of its window, with a button
 * installing the newest release beside this one's folder if github has a newer
 * one, then opening it. it's checked once, when the launcher opens, by c1x's
 * tools (c1x_tools check-update), which install it too (c1x_tools download-release);
 * a build that isn't a release has no version, and doesn't check
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "version_corner.h"
#include "command.h"
#include "help.h"
#include "newer_release.h"
#include "paths.h"
#include "release_download.h"
#include "tools.h"
#include "ui.h"
#include "version.h"

#define LABEL_MAX 64
#define COMMAND_MAX (PATH_MAX_LEN + 64)

/* where the newer release is up to */
typedef enum {
  RELEASE_NONE,        /* there isn't a newer one (or it's not known yet) */
  RELEASE_OFFERED,     /* there is, to download */
  RELEASE_INSTALLING,
  RELEASE_INSTALLED,   /* unzipped beside this folder, to open */
  RELEASE_FAILED,      /* it couldn't be installed */
} release_state;

static char tools_repo[PATH_MAX_LEN];              /* the repo the tools are run in */
static background_command release_check;           /* c1x_tools check-update */
static background_command release_download;        /* c1x_tools download-release */
static char newer_version[RELEASE_VERSION_MAX];    /* "" until the check finds one */
static char installed_folder[PATH_MAX_LEN];        /* "" until the download installs it */

void StartReleaseCheck(const char *repo) {
  char command[COMMAND_MAX];

  SDL_strlcpy(tools_repo, repo, sizeof(tools_repo));
  if (!AreToolsBuilt(repo)) { return; }
  /* no command for a dev build, which has no version to compare */
  if (!NewerReleaseCommand(repo, LauncherVersion(), command, sizeof(command))) { return; }
  StartBackgroundCommand(&release_check, repo, command);
}

void FollowNewerRelease(void) {
  UpdateBackgroundCommand(&release_check);
  if (!newer_version[0]) {
    FindNewerRelease(release_check.output, newer_version, sizeof(newer_version));
  }
  UpdateBackgroundCommand(&release_download);
  if (!installed_folder[0]) {
    FindInstalledRelease(release_download.output, installed_folder,
      sizeof(installed_folder));
  }
}

void StopNewerRelease(void) {
  StopBackgroundCommand(&release_check);
  StopBackgroundCommand(&release_download);
}

static release_state ReleaseState(void) {
  if (!newer_version[0]) { return RELEASE_NONE; }
  if (installed_folder[0]) { return RELEASE_INSTALLED; }
  if (IsBackgroundCommandRunning(&release_download)) { return RELEASE_INSTALLING; }
  if (release_download.output[0]) { return RELEASE_FAILED; }
  return RELEASE_OFFERED;
}

static void StartReleaseDownload(void) {
  char command[COMMAND_MAX];

  if (!DownloadReleaseCommand(tools_repo, newer_version, command, sizeof(command))) {
    return;
  }
  StartBackgroundCommand(&release_download, tools_repo, command);
}

/* opens the new version in place of this one: its launcher, or its folder if
   that can't start, so the player can open it themselves */
static void OpenInstalledRelease(void) {
  char url[FILE_URL_MAX];
  SDL_Event quit;

  if (!StartInstalledLauncher(installed_folder)) {
    FileUrl(installed_folder, url, sizeof(url));
    SDL_OpenURL(url);
    return;
  }
  SDL_zero(quit);
  quit.type = SDL_QUIT;
  SDL_PushEvent(&quit);
}

static void OpenButtonLabel(char *label, size_t size) {
  SDL_snprintf(label, size, "Open v%s", newer_version);
}

static float TextWidth(const char *text) {
  ImVec2 text_size;

  igCalcTextSize(&text_size, text, 0, false, -1.0f);
  return text_size.x;
}

/* what the release part of the corner says, for state, into label */
static void ReleaseLabel(release_state state, char *label, size_t size) {
  label[0] = 0;
  if (state == RELEASE_OFFERED) {
    SDL_snprintf(label, size, "Version %s is out", newer_version);
  } else if (state == RELEASE_INSTALLING) {
    SDL_snprintf(label, size, "Installing v%s...", newer_version);
  } else if (state == RELEASE_INSTALLED) {
    SDL_snprintf(label, size, "v%s is ready", newer_version);
  } else if (state == RELEASE_FAILED) {
    SDL_snprintf(label, size, "Couldn't install v%s: open its page", newer_version);
  }
}

/* whether the corner shows the launcher's own version: not beside the download's
   message, where a second version reads as if it were part of it */
static int ShowsOwnVersion(release_state state) {
  return state == RELEASE_NONE || state == RELEASE_OFFERED;
}

static float ReleasePartWidth(release_state state, const char *label) {
  char open_label[LABEL_MAX];

  if (state == RELEASE_NONE) { return 0; }
  if (state == RELEASE_INSTALLING) { return TextWidth(label); }
  if (state == RELEASE_INSTALLED) {
    OpenButtonLabel(open_label, sizeof(open_label));
    return TextWidth(label) + igGetStyle()->ItemSpacing.x + ButtonWidth(open_label);
  }
  return ButtonWidth(label);
}

/* how wide the corner is: its release part, and the launcher's version if it shows */
static float CornerWidth(release_state state, const char *release_label,
  const char *version_label) {
  float width;

  width = ReleasePartWidth(state, release_label);
  if (!ShowsOwnVersion(state)) { return width; }
  if (width > 0) { width += igGetStyle()->ItemSpacing.x; }
  return width + TextWidth(version_label);
}

static void DrawInstalledRelease(const char *label) {
  char open_label[LABEL_MAX];

  igText("%s", label);
  DrawTooltip(installed_folder);
  igSameLine(0, -1);
  OpenButtonLabel(open_label, sizeof(open_label));
  if (igSmallButton(open_label)) { OpenInstalledRelease(); }
  DrawTooltip("Close this launcher and open the new version's.");
}

static void DrawReleasePart(release_state state, const char *label) {
  if (state == RELEASE_NONE) { return; }
  if (state == RELEASE_OFFERED) {
    if (igSmallButton(label)) { StartReleaseDownload(); }
    DrawTooltip("Install it beside this folder, with your settings, saves and levels.");
  } else if (state == RELEASE_INSTALLING) {
    igTextDisabled("%s", label);
  } else if (state == RELEASE_INSTALLED) {
    DrawInstalledRelease(label);
  } else {
    if (igSmallButton(label)) { SDL_OpenURL(LATEST_RELEASE_PAGE); }
    DrawTooltip(release_download.output);
  }
}

/* right-aligned on the line the cursor is on. the cursor is put back after,
   so what's drawn next (the game section's heading) starts on the same line */
void DrawVersionCorner(void) {
  char version_label[VERSION_LABEL_MAX], release_label[LABEL_MAX];
  ImVec2 start, available;
  release_state state;
  float width, indent;

  state = ReleaseState();
  ReleaseLabel(state, release_label, sizeof(release_label));
  VersionLabel(LauncherVersion(), 0, version_label, sizeof(version_label));
  width = CornerWidth(state, release_label, version_label);
  igGetCursorPos(&start);
  igGetContentRegionAvail(&available);
  indent = SDL_max(0.0f, available.x - width); /* from the left in a window too narrow for it */
  igSetCursorPosX(start.x + indent);
  DrawReleasePart(state, release_label);
  if (ShowsOwnVersion(state)) {
    if (state != RELEASE_NONE) { igSameLine(0, -1); }
    igTextDisabled("%s", version_label);
  }
  igSetCursorPos(start);
}
