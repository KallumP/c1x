/*
 * coop in the game: what it has to ask the loaded level. see coop.h
 */
#include "coop.h"
#include "level.h"
#include "solid.h"
#include "ns.h"
#include "settings.h"

#define NO_FLOOR       -999999999 /* the game's own floor search's "nothing there" */
#define FLOOR_BELOW    0x8000     /* how far under a spot still counts as its floor: a third of a box */
#define FLOOR_ABOVE    62500      /* and how far over it: the step up the game lets crash land on */

extern ns_struct ns;
extern entry *cur_zone;
extern bound test_bound_surface; /* the sliver of crash the game finds his floor with */

static zone_query floor_query;

/* pits, water and the like aren't floor to start on */
static int SkipHazardNode(gool_object *obj, uint32_t node) {
  return 1;
}

/* level floor only: boxes and platforms don't count */
int CoopFloorBelow(vec *trans) {
  zone_query_summary found;
  bound feet;

  if (!cur_zone) { return 0; }
  ZoneQueryOctrees(trans, 0, &floor_query);
  GoolCalcBound(&test_bound_surface, trans, &feet);
  feet.p1.y -= FLOOR_BELOW;
  FindFloorY(0, &floor_query, &floor_query.nodes_bound, &feet, trans->y + FLOOR_ABOVE,
    &found, NO_FLOOR, SkipHazardNode);
  return found.floor_nodes_y != NO_FLOOR || found.solid_nodes_y != NO_FLOOR;
}

const crash_outfit *CoopPlayerOutfit(gool_object *obj) {
  const crash_outfit *outfit;
  int player_idx;

  player_idx = CoopPlayerIndex(obj);
  if (player_idx == COOP_NOT_A_PLAYER || !CoopLevelShowsOutfits(ns.ldat->lid)) { return 0; }
  outfit = &game_settings.outfits[player_idx];
  if (OutfitIsCrashsOwn(outfit)) { return 0; }
  return outfit;
}
