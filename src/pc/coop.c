#include "coop.h"
#include "boxhud.h"

extern pad pads[2];
extern gool_handle handles[8];

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

/* a hud counter (lives, wumpa, crystals, boxes) or a part of one */
int CoopObjectIsOnHud(gool_object *obj) {
  gool_object *top;

  top = obj;
  while (top->parent && top->parent->handle.subtype == GOOL_OBJECT_SUBTYPE)
    top = top->parent;
  return top->parent == (gool_object*)&handles[HUD_HANDLE];
}

/* every button any player in play presses, as one pad */
static pad CoopEveryPlayersPad() {
  pad every = { 0 };
  int idx;

  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++) {
    if (!CoopPlayerInPlay(idx)) { continue; }
    every.tapped |= pads[idx].tapped;
    every.held |= pads[idx].held;
    every.held_prev |= pads[idx].held_prev;
    every.tapped_prev |= pads[idx].tapped_prev;
    every.held_prev2 |= pads[idx].held_prev2;
  }
  return every;
}

/* the buttons obj's code tests: the hud (which opens on triangle) every player's,
   anything else its pad port's */
pad CoopObjectPad(gool_object *obj) {
  if (CoopObjectIsOnHud(obj)) { return CoopEveryPlayersPad(); }
  return pads[CoopObjectPadPort(obj)];
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

/* an object after a crash goes after the nearest one; a player link its script
   set to something else (a collected fruit's target) stays */
void CoopAimAtNearestPlayer(gool_object *obj) {
  if (!CoopIsPlayer(obj->player)) { return; }
  obj->player = CoopNearestPlayer(&obj->trans);
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
