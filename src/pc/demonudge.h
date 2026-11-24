#ifndef _PC_DEMONUDGE_H_
#define _PC_DEMONUDGE_H_

#include "common.h"

/*
 * a demo's buttons, nudged (pc): played back here, jungle rollers' demo drifts
 * a little from the ps1's, so at the end crash's jump for the iron crates,
 * after he breaks the last crate, falls short of them. he walks forward a
 * little first, in frames he stood still in on the ps1, so he lands on them
 */
#define DEMO_NUDGE_FRAME_COUNT 1348 /* the frames in jungle rollers' demo */

/* the buttons held in frame of a demo of frame_count frames in level lid, recorded as held */
static inline uint32_t DemoNudgedHeld(uint32_t lid, int frame_count, int frame,
  uint32_t held) {
  return held;
}

#endif /* _PC_DEMONUDGE_H_ */
