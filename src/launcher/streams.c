/*
 * the game's files in streams/: an .nsd and an .nsf for each of its levels
 */
#include <SDL2/SDL.h>
#include "common.h"
#include "streams.h"
#include "paths.h"

/* every level id the game has files for (LID_TEST and LID_LAVACAVE have none) */
static const int game_level_ids[] = {
  LID_CORTEXPOWER, LID_CAVE, LID_GENERATORROOM, LID_HEAVYMACHINERY,
  LID_TOXICWASTE, LID_PINSTRIPE, LID_NSANITYBEACH, LID_PAPUPAPU,
  LID_JUNGLEROLLERS, LID_BOULDERS, LID_UPSTREAM, LID_HOGWILD,
  LID_THEGREATGATE, LID_BOULDERDASH, LID_ROADTONOWHERE, LID_ROLLINGSTONES,
  LID_THEHIGHROAD, LID_RIPPERROO, LID_UPTHECREEK, LID_TITLE,
  LID_NATIVEFORTRESS, LID_DRNBRIO, LID_TEMPLERUINS, LID_JAWSOFDARKNESS,
  LID_WHOLEHOG, LID_DRNEOCORTEX, LID_THELOSTCITY, LID_KOALAKONG,
  LID_STORMYASCENT, LID_SUNSETVISTA, LID_BONUSTAWNA1, LID_BONUSBRIO,
  LID_BONUS, LID_LIGHTSOUT, LID_THELAB, LID_FUMBLINGINTHEDARK,
  LID_THEGREATHALL, LID_LEVELEND, LID_SLIPPERYCLIMB, LID_BONUSTAWNA2,
  LID_BONUSCORTEX, LID_CASTLEMACHINERY, LID_INTRO, LID_GAMEWIN
};

#define GAME_LEVEL_COUNT (int)(sizeof(game_level_ids) / sizeof(game_level_ids[0]))

/* the level's file name, lowercase as the game opens it (see NSGetFilename in ns.c) */
void StreamFileName(int level_id, const char *extension, char *name, size_t size) {
  SDL_snprintf(name, size, "s%07x.%s", level_id, extension);
}

static int IsStreamFileThere(const char *repo, const char *name) {
  char folder[PATH_MAX_LEN];
  char path[PATH_MAX_LEN];
  SDL_RWops *file;

  JoinPath(folder, sizeof(folder), repo, "streams");
  JoinPath(path, sizeof(path), folder, name);
  file = SDL_RWFromFile(path, "rb");
  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

static void AddIfMissing(const char *repo, int level_id, const char *extension,
  stream_files *missing) {
  char name[STREAM_FILE_NAME_MAX];

  StreamFileName(level_id, extension, name, sizeof(name));
  if (IsStreamFileThere(repo, name)) { return; }
  SDL_strlcpy(missing->names[missing->count], name, STREAM_FILE_NAME_MAX);
  missing->count++;
}

/* the game's files missing from repo/streams/, in level id order */
void ListMissingStreamFiles(const char *repo, stream_files *missing) {
  int i;

  missing->count = 0;
  for (i = 0; i < GAME_LEVEL_COUNT; i++) {
    AddIfMissing(repo, game_level_ids[i], "nsd", missing);
    AddIfMissing(repo, game_level_ids[i], "nsf", missing);
  }
}
