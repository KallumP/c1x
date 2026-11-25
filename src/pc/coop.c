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

/* the zone's colours for obj: every player takes the player colours, other objects the object colours */
gool_colors *CoopZoneColors(gool_object *obj, zone_header *header) {
  if (CoopIsPlayer(obj)) { return &header->player_colors; }
  return &header->object_colors;
}

/* the player's slot in the tween pose table (pc/tween.h), after the objects' */
int CoopPlayerTweenSlot(int idx) {
  return GOOL_OBJECT_COUNT + idx;
}

/* where player two starts, beside player one at lead */
vec CoopBesideLead(vec lead) {
  vec beside = lead;

  beside.x += COOP_BESIDE_DISTANCE;
  return beside;
}
