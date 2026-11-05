#ifndef _PC_FLING_H_
#define _PC_FLING_H_

#include "common.h"
#include "geom.h"
#include "ns.h"

/*
 * how far a flung enemy breaks boxes (pc): an enemy crash spins is flung
 * straight back and breaks every box it passes. the game's own levels wall
 * it in, but a custom level is open, so there it only breaks boxes near
 * where it stood, and flies on through the rest
 */
#define FLING_REACH        (1200 << 8) /* 3 m at scale 400 (game units) */
#define FLING_ENEMY        0x300       /* the gool category of enemies */
#define FLING_BOX          0x400       /* and of boxes */

/* whether a flung enemy now at at, which stood at stood, breaks a box it
   passes: within FLING_REACH of where it stood, across the ground, in a
   custom level, and always in the game's own levels */
static inline int FlingBreaksBox(lid_t lid, vec *stood, vec *at) {
  int64_t dx, dz;

  if (lid != LID_TEST) { return 1; }
  dx = at->x - stood->x;
  dz = at->z - stood->z;
  return dx*dx + dz*dz <= (int64_t)FLING_REACH*FLING_REACH;
}

#endif /* _PC_FLING_H_ */
