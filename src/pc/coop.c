#include "coop.h"

/* each player's own object slot, outside the object pool; player one's is crash's */
gool_object *players[GOOL_PLAYER_COUNT];

/* which player's slot obj is, or COOP_NOT_A_PLAYER */
int CoopPlayerIndex(gool_object *obj) {
  int i;

  for (i=0;i<GOOL_PLAYER_COUNT;i++) {
    if (obj == players[i]) { return i; }
  }
  return COOP_NOT_A_PLAYER;
}

int CoopIsPlayer(gool_object *obj) {
  return CoopPlayerIndex(obj) != COOP_NOT_A_PLAYER;
}

/* the player is in the level: their slot holds a live object */
int CoopPlayerInPlay(int idx) {
  return players[idx]->handle.type != 0;
}

gool_colors *CoopZoneColors(gool_object *obj, zone_header *header) {
  if (CoopIsPlayer(obj)) { return &header->player_colors; }
  return &header->object_colors;
}

/* the player's slot in the tween pose table (pc/tween.h), after the objects' */
int CoopPlayerTweenSlot(int idx) {
  return GOOL_OBJECT_COUNT + idx;
}

/* the pads[] entry obj reads: each player their own pad, every other object pad 1's */
int CoopObjectPadPort(gool_object *obj) {
  int player_idx;

  player_idx = CoopPlayerIndex(obj);
  if (player_idx == COOP_NOT_A_PLAYER) { return 0; }
  return player_idx;
}

static int64_t DistanceSquared(vec *a, vec *b) {
  int64_t dx, dy, dz;

  dx = a->x - b->x;
  dy = a->y - b->y;
  dz = a->z - b->z;
  return dx*dx + dy*dy + dz*dz;
}

/* the player in play nearest trans; player one when no one else is in play */
gool_object *CoopNearestPlayer(vec *trans) {
  gool_object *nearest;
  int64_t nearest_distance, distance;
  int idx;

  nearest = players[0];
  nearest_distance = INT64_MAX;
  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++) {
    if (!CoopPlayerInPlay(idx)) { continue; }
    distance = DistanceSquared(&players[idx]->trans, trans);
    if (distance < nearest_distance) {
      nearest = players[idx];
      nearest_distance = distance;
    }
  }
  return nearest;
}

/* the checkpoint is player one's: a player two running crash's script never saves it */
int CoopMaySaveLevelState(gool_object *obj) {
  return CoopPlayerIndex(obj) != COOP_PLAYER_TWO;
}

/* where player two starts, beside player one at lead */
vec CoopBesideLead(vec lead) {
  vec beside;

  beside = lead;
  beside.x += COOP_BESIDE_DISTANCE;
  return beside;
}
