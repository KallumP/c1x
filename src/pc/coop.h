#ifndef _PC_COOP_H_
#define _PC_COOP_H_

#include "common.h"
#include "geom.h"
#include "gool.h"

/*
 * local multiplayer (pc): with the two_players setting on, a second crash
 * plays beside the first, from the same crash program, on pad port 1
 */
#define COOP_PLAYER_COUNT    2       /* player one (crash) and player two */
#define COOP_NOT_A_PLAYER    -1      /* CoopPlayerIndex of any other object */
#define COOP_PLAYER_TWO_PORT 1       /* the pad player two reads */
#define COOP_BESIDE_DISTANCE 0x32000 /* how far beside player one he starts: two boxes */

extern gool_object *players[COOP_PLAYER_COUNT];

extern int CoopPlayerIndex(gool_object *obj);
extern int CoopIsPlayer(gool_object *obj);
extern int CoopPlayerTweenSlot(int index);
extern vec CoopBesideLead(vec lead);

#endif /* _PC_COOP_H_ */
