#ifndef _PC_TWEEN_H_
#define _PC_TWEEN_H_

#include "common.h"
#include "geom.h"

/*
 * drawing frames between game frames (pc). the game runs at 30 fps; while
 * it waits for the next game frame, frames are drawn with the camera and
 * objects part way (alpha) from where they were in the previous game frame
 * to where they are in the current one
 */
#define TWEEN_ONE  0x1000  /* alpha for all the way to the current game frame */
#define TWEEN_JUMP 0x80000 /* a move further than this in a game frame is a jump (respawn, teleport), not tweened */

/* how far through a game frame of frame_ticks ticks elapsed ticks are, as an alpha */
static inline int32_t TweenAlpha(int32_t elapsed, int32_t frame_ticks) {
  if (frame_ticks <= 0 || elapsed >= frame_ticks) { return TWEEN_ONE; }
  if (elapsed <= 0) { return 0; }
  return (elapsed * TWEEN_ONE) / frame_ticks;
}

static inline int32_t TweenLerp(int32_t a, int32_t b, int32_t alpha) {
  return a + (int32_t)(((int64_t)b - a) * alpha / TWEEN_ONE);
}

/* lerp between 12-bit angles the short way round; ends on b itself */
static inline int32_t TweenLerpAngle(int32_t a, int32_t b, int32_t alpha) {
  int32_t delta;

  if (alpha >= TWEEN_ONE) { return b; }
  delta = (b - a) & 0xFFF;
  if (delta >= 0x800)
    delta -= 0x1000;
  return a + (delta * alpha) / TWEEN_ONE;
}

static inline int TweenJumped(vec *a, vec *b) {
  int i;

  for (i = 0; i < 3; i++) {
    if (abs(b->c[i] - a->c[i]) > TWEEN_JUMP) { return 1; }
  }
  return 0;
}

static inline void TweenLerpVec(vec *a, vec *b, int32_t alpha, vec *out) {
  int i;

  for (i = 0; i < 3; i++)
    out->c[i] = TweenLerp(a->c[i], b->c[i], alpha);
}

static inline void TweenLerpAng(ang *a, ang *b, int32_t alpha, ang *out) {
  int i;

  for (i = 0; i < 3; i++)
    out->c[i] = TweenLerpAngle(a->c[i], b->c[i], alpha);
}

#endif /* _PC_TWEEN_H_ */
