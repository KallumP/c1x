#include "jumpgrace.h"

/* count crash's frames off the floor, from 0 while he's on it */
void JumpGraceTrackFloor(jump_grace *grace, int on_floor) {
  if (on_floor) {
    grace->frames_off_floor = 0;
    return;
  }
  if (grace->frames_off_floor <= JUMP_GRACE_FRAMES)
    grace->frames_off_floor++;
}

static int JustLeftTheFloor(const jump_grace *grace) {
  return grace->frames_off_floor >= 1
    && grace->frames_off_floor <= JUMP_GRACE_FRAMES;
}

/* whether crash, off the floor, counts as on it this frame to jump */
int JumpGraceCountsAsFloor(const jump_grace *grace, int32_t velocity_y,
  uint32_t tapped) {
  if (!(tapped & JUMP_GRACE_BUTTON)) { return 0; }
  if (velocity_y > 0) { return 0; } /* rising: already jumping */
  return JustLeftTheFloor(grace);
}
