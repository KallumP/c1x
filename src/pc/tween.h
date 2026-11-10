#ifndef _PC_TWEEN_H_
#define _PC_TWEEN_H_

#include "common.h"
#include "geom.h"
#include "pc/pace.h"

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

/*
 * pacing. a game frame (FRAME_TICKS) is split into slots, one per frame drawn
 * at frame_rate; slot n starts this many ticks into the game frame
 */
static inline int32_t TweenSlotTicks(int slot, uint32_t frame_rate) {
  return (slot * FRAME_TICKS * 30) / (int32_t)frame_rate;
}

/* the last slot started by elapsed ticks into the game frame */
static inline int TweenSlotsDue(int32_t elapsed, uint32_t frame_rate) {
  int slot;

  slot = 0;
  while (TweenSlotTicks(slot+1, frame_rate) <= elapsed)
    slot++;
  return slot;
}

/*
 * whether to draw a frame between game frames now: a slot has started since
 * the last one drawn (drawn) and it starts before the game frame is due
 */
static inline int TweenFrameDue(int32_t elapsed, int32_t frame_ticks, int drawn,
                                uint32_t frame_rate) {
  int slot;

  if (elapsed >= frame_ticks) { return 0; }
  slot = TweenSlotsDue(elapsed, frame_rate);
  return slot > drawn && TweenSlotTicks(slot, frame_rate) < frame_ticks;
}

static inline void TweenLerpAng(ang *a, ang *b, int32_t alpha, ang *out) {
  int i;

  for (i = 0; i < 3; i++)
    out->c[i] = TweenLerpAngle(a->c[i], b->c[i], alpha);
}

/* where an object is drawn: its position, rotation and scale */
typedef struct {
  vec trans;
  ang rot;
  vec scale;
} tween_pose;

#define TWEEN_SLOTS 128 /* poses kept, one per object (GOOL_OBJECT_COUNT, plus the player) */

extern void TweenForgetAll();
extern void TweenForget(int slot);
extern void TweenRecord(int slot, const tween_pose *pose);
extern void TweenPoseAt(int slot, const tween_pose *now, int32_t alpha, tween_pose *out);

#endif /* _PC_TWEEN_H_ */
