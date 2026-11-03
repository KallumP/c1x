/*
 * the launcher's game section: the Play button, which saves the settings
 * then starts the game
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "game_section.h"
#include "game.h"
#include "paths.h"
#include "settings_section.h"

#define PROBLEM_COLOUR ((ImVec4){1.0f, 0.45f, 0.4f, 1.0f})

static char play_problem[PATH_MAX_LEN + 64]; /* why Play last failed, or "" */

static void DrawNotBuilt(const char *repo) {
  char path[PATH_MAX_LEN];

  GamePath(repo, path, sizeof(path));
  igTextColored(PROBLEM_COLOUR, "The game isn't built: there's no %s.", path);
  igTextWrapped("Build it with make, or rebuild.bat on Windows (see doc/building.md).");
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
  DrawPlayButton(repo);
}
