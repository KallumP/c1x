#ifndef _PC_COOP_H_
#define _PC_COOP_H_

#include "common.h"
#include "geom.h"

/*
 * local multiplayer (pc): with the two_players setting on, a second crash
 * plays beside the first, from the same crash program, on pad port 1
 */
#define COOP_PLAYER_TWO_PORT 1       /* the pad player two reads */
#define COOP_BESIDE_DISTANCE 0x32000 /* how far beside player one he starts: two boxes */

extern vec CoopBesideLead(vec lead);

#endif /* _PC_COOP_H_ */
