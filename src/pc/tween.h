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
/* the same for an object on the screen (the hud, and what flies to it), in
   its far smaller screen units: the newest hud token blinks by jumping off
   the screen and back, which would be tweened across it */
#define TWEEN_SCREEN_JUMP 0x8000

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

/* whether a move from a to b goes further than limit along an axis */
static inline int TweenJumpedFurther(vec *a, vec *b, int32_t limit) {
  int i;

  for (i = 0; i < 3; i++) {
    if (abs(b->c[i] - a->c[i]) > limit) { return 1; }
  }
  return 0;
}

static inline void TweenLerpVec(vec *a, vec *b, int32_t alpha, vec *out) {
  int i;

  for (i = 0; i < 3; i++)
    out->c[i] = TweenLerp(a->c[i], b->c[i], alpha);
}

/* pacing frames between game frames: evenly spaced, by when they're shown */
typedef struct {
  int drawn;           /* the frames between drawn (or passed) this game frame */
  int32_t shown_ticks; /* how far into the game frame its own frame was shown */
} tween_pacer;

extern void TweenPacerReset(tween_pacer *p);
extern int TweenFramesPerGameFrame(int32_t frame_ticks, uint32_t frame_rate);
extern int TweenFrameDue(const tween_pacer *p, int32_t elapsed, int32_t frame_ticks,
  uint32_t frame_rate, int32_t draw_ticks);
extern void TweenPacerDrew(tween_pacer *p, int32_t elapsed, int32_t frame_ticks, uint32_t frame_rate,
  int32_t draw_ticks);
extern void TweenPacerNextGameFrame(tween_pacer *p, int32_t shown_ticks);

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

#define TWEEN_SLOTS       192 /* poses kept, one per object (GOOL_OBJECT_COUNT, plus the player) ... */
#define TWEEN_CAMERA_SLOT 191 /* ... and the camera's */

extern void TweenForgetAll();
extern void TweenForget(int slot);
extern void TweenRecord(int slot, const tween_pose *pose);
extern void TweenWorldPoseAt(int slot, const tween_pose *now, int32_t alpha, tween_pose *out);
extern void TweenScreenPoseAt(int slot, const tween_pose *now, int32_t alpha,
  tween_pose *out);
extern void TweenRecordCamera(const tween_pose *drawn);
extern void TweenCameraAt(int32_t alpha, tween_pose *out);

#endif /* _PC_TWEEN_H_ */
