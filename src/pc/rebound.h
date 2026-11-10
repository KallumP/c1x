#ifndef _PC_REBOUND_H_
#define _PC_REBOUND_H_

#include "common.h"
#include "ns.h"

/*
 * a ray through the zones (ZoneReboundVector, pc): at each step it looks for
 * the zone it has moved into in the current zone's neighbour list, which lists
 * the zone itself first. the game's own levels look on only after the zone the
 * ray was in, so a ray from a neighbouring zone can't cross back into the
 * current one; a custom level's zones are short, so a gunman's shot at crash
 * often has to (it ends where its ray does): there the ray looks through every
 * neighbour again, giving up after a number of steps
 */
#define REBOUND_STEPS_MAX 256

/* where in the neighbour list to look for the ray's next zone, having looked up to after */
static inline int ReboundSearchFrom(lid_t lid, int after) {
  if (lid == LID_TEST) { return 0; }
  return after;
}

/* whether a ray has taken too many steps to go on */
static inline int ReboundGivesUp(lid_t lid, int steps) {
  return lid == LID_TEST && steps >= REBOUND_STEPS_MAX;
}

#endif /* _PC_REBOUND_H_ */
