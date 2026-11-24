#ifndef _PC_DEMONUDGE_H_
#define _PC_DEMONUDGE_H_

#include "common.h"
#include "ns.h"
#include "pc/pad.h"

/*
 * a demo's buttons, nudged (pc): played back here, jungle rollers' demo drifts
 * a little from the ps1's, so at the end crash's jump for the iron crates,
 * after he breaks the last crate, falls short of them. he walks forward (up)
 * a little first, in frames he stood still in on the ps1, so he lands on them
 */
#define DEMO_NUDGE_FRAME_COUNT 1348 /* the frames in jungle rollers' demo */
#define DEMO_NUDGE_FIRST_FRAME 1246 /* he's landed in front of the last crate */
#define DEMO_NUDGE_FRAMES      6

static inline int IsJungleRollersDemo(lid_t lid, int frame_count) {
  return lid == LID_JUNGLEROLLERS && frame_count == DEMO_NUDGE_FRAME_COUNT;
}

static inline int IsNudgedFrame(int frame) {
  return frame >= DEMO_NUDGE_FIRST_FRAME
    && frame < DEMO_NUDGE_FIRST_FRAME + DEMO_NUDGE_FRAMES;
}

static inline uint32_t DemoNudgedHeld(lid_t lid, int frame_count, int frame,
  uint32_t held) {
  if (IsJungleRollersDemo(lid, frame_count) && IsNudgedFrame(frame))
    return PAD_UP;
  return held;
}

#endif /* _PC_DEMONUDGE_H_ */
