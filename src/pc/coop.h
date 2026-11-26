#ifndef _PC_COOP_H_
#define _PC_COOP_H_

#include "common.h"
#include "geom.h"
#include "gool.h"
#include "pad.h"

/*
 * local multiplayer (pc): with the two_players setting on, a second crash
 * plays beside the first, from the same crash program, on pad 2
 */
#define COOP_NOT_A_PLAYER    -1      /* CoopPlayerIndex of any other object */
#define COOP_PLAYER_TWO      1       /* player two's index in players */
#define COOP_BESIDE_DISTANCE 0x32000 /* how far beside player one he starts: two boxes */

/* how near a player an object keeps its collision bound: five boxes to a side, seven up or down */
#define COOP_NEAR_RANGE_XZ   0x7D000
#define COOP_NEAR_RANGE_Y    0xAF000

extern gool_object *players[GOOL_PLAYER_COUNT];

extern int CoopPlayerIndex(gool_object *obj);
extern int CoopIsPlayer(gool_object *obj);
extern int CoopPlayerInPlay(int idx);
extern gool_colors *CoopZoneColors(gool_object *obj, zone_header *header);
extern int CoopPlayerTweenSlot(int idx);
extern int CoopObjectPadPort(gool_object *obj);
extern int CoopObjectIsOnHud(gool_object *obj);
extern pad CoopObjectPad(gool_object *obj);
extern gool_object *CoopNearestPlayer(vec *trans);
extern int CoopObjectNearAnyPlayer(gool_object *obj);
extern void CoopAimAtNearestPlayer(gool_object *obj);
extern int CoopMaySaveLevelState(gool_object *obj);
extern vec CoopBesideLead(vec lead);

#endif /* _PC_COOP_H_ */
