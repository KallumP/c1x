/*
 * the launcher's game section: the Play button, which saves the settings
 * then starts the game, or what's stopping the game from running
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "game_section.h"
#include "game.h"
#include "paths.h"
#include "settings_section.h"
#include "streams.h"
#include "extract_section.h"

#define PROBLEM_COLOUR ((ImVec4){1.0f, 0.45f, 0.4f, 1.0f})
#define MISSING_FILES_SHOWN 8

static char play_problem[PATH_MAX_LEN + 64]; /* why Play last failed, or "" */
static stream_files missing_streams;

void LoadGameSection(const char *repo) {
  ListMissingStreamFiles(repo, &missing_streams);
}

static void DrawNotBuilt(const char *repo) {
  char path[PATH_MAX_LEN];

  GamePath(repo, path, sizeof(path));
  igTextColored(PROBLEM_COLOUR, "The game isn't built: there's no %s.", path);
  igTextWrapped("Build it with make, or rebuild.bat on Windows (see doc/building.md).");
}

static void DrawMissingFileNames(void) {
  int i;

  for (i = 0; i < missing_streams.count && i < MISSING_FILES_SHOWN; i++) {
    igBulletText("%s", missing_streams.names[i]);
  }
  if (missing_streams.count > MISSING_FILES_SHOWN) {
    igBulletText("and %d more", missing_streams.count - MISSING_FILES_SHOWN);
  }
}

static void DrawStreamsMissing(const char *repo) {
  char folder[PATH_MAX_LEN];

  JoinPath(folder, sizeof(folder), repo, "streams");
  if (missing_streams.count == STREAM_FILE_COUNT) {
    igTextColored(PROBLEM_COLOUR, "The game's files aren't in %s.", folder);
  }
  else {
    igTextColored(PROBLEM_COLOUR, "%d of the game's %d files are missing from %s:",
      missing_streams.count, STREAM_FILE_COUNT, folder);
    DrawMissingFileNames();
  }
  igTextWrapped("Copy them from your game disc (see doc/running.md) and click Check again, "
    "or extract them from a disc image of your own copy.");
  if (igButton("Check again", (ImVec2){0, 0})) { LoadGameSection(repo); }
  igSpacing();
  if (DrawExtractStreams(repo)) { LoadGameSection(repo); }
}

static void DrawPlayButton(const char *repo) {
  char path[PATH_MAX_LEN];

  if (igButton("Play", (ImVec2){120, 0})) {
    play_problem[0] = 0;
    if (!SaveSettingsSection(repo)) {
      SDL_strlcpy(play_problem, "Couldn't save the settings, so the game wasn't started.",
        sizeof(play_problem));
    }
    else if (!StartGame(repo)) {
      GamePath(repo, path, sizeof(path));
      SDL_snprintf(play_problem, sizeof(play_problem), "Couldn't start %s.", path);
    }
  }
  if (play_problem[0]) { igTextColored(PROBLEM_COLOUR, "%s", play_problem); }
}

void DrawGameSection(const char *repo) {
  igText("Game");
  igSeparator();
  if (!IsGameBuilt(repo)) {
    DrawNotBuilt(repo);
    return;
  }
  if (missing_streams.count) {
    DrawStreamsMissing(repo);
    return;
  }
  DrawPlayButton(repo);
}
