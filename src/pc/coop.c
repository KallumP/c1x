#include "coop.h"

/* each player's own object slot, outside the object pool; player one's is crash's */
gool_object *players[COOP_PLAYER_COUNT];

/* which player's slot obj is, or COOP_NOT_A_PLAYER */
int CoopPlayerIndex(gool_object *obj) {
  int i;

  for (i=0;i<COOP_PLAYER_COUNT;i++) {
    if (obj == players[i]) { return i; }
  }
  return COOP_NOT_A_PLAYER;
}

int CoopIsPlayer(gool_object *obj) {
  return CoopPlayerIndex(obj) != COOP_NOT_A_PLAYER;
}

/* the player's slot in the tween pose table (pc/tween.h), after the objects' */
int CoopPlayerTweenSlot(int index) {
  return GOOL_OBJECT_COUNT + index;
}

/* where player two starts, beside player one at lead */
vec CoopBesideLead(vec lead) {
  vec beside = lead;

  beside.x += COOP_BESIDE_DISTANCE;
  return beside;
}
