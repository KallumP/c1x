#include "pc/tween.h"

/* each object's pose in the last game frame, by slot */
static tween_pose last_poses[TWEEN_SLOTS];
static int has_last_pose[TWEEN_SLOTS];
/* the camera pose the current game frame was drawn at */
static tween_pose drawn_camera;
static int has_drawn_camera = 0;

static int IsSlot(int slot) {
  return slot >= 0 && slot < TWEEN_SLOTS;
}

void TweenForgetAll() {
  int i;

  for (i = 0; i < TWEEN_SLOTS; i++)
    has_last_pose[i] = 0;
  has_drawn_camera = 0;
}

/* forget the slot's pose, as a new object has it */
void TweenForget(int slot) {
  if (!IsSlot(slot)) { return; }
  has_last_pose[slot] = 0;
}

/* keep pose as the slot's pose in the last game frame */
void TweenRecord(int slot, const tween_pose *pose) {
  if (!IsSlot(slot)) { return; }
  last_poses[slot] = *pose;
  has_last_pose[slot] = 1;
}

/* a scale is tweened unless it flipped over (a mirrored model) */
static int32_t TweenScale(int32_t last, int32_t now, int32_t alpha) {
  if ((last < 0) != (now < 0)) { return now; }
  return TweenLerp(last, now, alpha);
}

static void TweenScaleVec(vec *last, vec *now, int32_t alpha, vec *out) {
  int i;

  for (i = 0; i < 3; i++)
    out->c[i] = TweenScale(last->c[i], now->c[i], alpha);
}

/*
 * the pose to draw the slot's object in, alpha of the way from its pose in the
 * last game frame to now. without one, or if it jumped, it's drawn where it is
 */
void TweenPoseAt(int slot, const tween_pose *now, int32_t alpha, tween_pose *out) {
  tween_pose *last, cur;

  cur = *now;
  *out = cur;
  if (!IsSlot(slot) || !has_last_pose[slot]) { return; }
  last = &last_poses[slot];
  if (TweenJumped(&last->trans, &cur.trans)) { return; }
  TweenLerpVec(&last->trans, &cur.trans, alpha, &out->trans);
  TweenLerpAng(&last->rot, &cur.rot, alpha, &out->rot);
  TweenScaleVec(&last->scale, &cur.scale, alpha, &out->scale);
}


/* keep the pose the camera was drawn at this game frame; the last one is tweened from */
void TweenRecordCamera(const tween_pose *drawn) {
  if (has_drawn_camera)
    TweenRecord(TWEEN_CAMERA_SLOT, &drawn_camera);
  drawn_camera = *drawn;
  has_drawn_camera = 1;
}

/* the camera pose to draw at, alpha of the way from the last game frame's to this one's */
void TweenCameraAt(int32_t alpha, tween_pose *out) {
  TweenPoseAt(TWEEN_CAMERA_SLOT, &drawn_camera, alpha, out);
}

/*
 * a game frame's frames are spaced evenly inside it: its own at its start,
 * then the frames between. the clock runs at 34000000/0x8000 ticks a second
 * (pc/time.c), so a game frame of frame_ticks is frame_ticks x frame_rate x
 * 0x8000 / 34000000 frames' worth at frame_rate, rounded to whole frames.
 * spacing them inside each game frame, rather than on a frame_rate clock of
 * their own, keeps them evenly apart: 34-tick game frames are a little
 * shorter than 1/30 s, so a clock of their own would drift across them
 */
#define TICKS_A_SECOND_UNITS 34000000 /* a second, in ticks x 0x8000 */

void TweenPacerReset(tween_pacer *p) {
  p->drawn = 0;
}

/* how many frames a game frame of frame_ticks has at frame_rate, its own included (at least 1) */
int TweenFramesPerGameFrame(int32_t frame_ticks, uint32_t frame_rate) {
  int64_t units;
  int frames;

  units = (int64_t)frame_ticks * frame_rate * 0x8000;
  frames = (int)((units + TICKS_A_SECOND_UNITS / 2) / TICKS_A_SECOND_UNITS);
  if (frames < 1) { return 1; }
  return frames;
}

/* the frames between whose time has come by elapsed ticks into the game frame (the kth is k/frames of the way) */
static int FramesBetweenStarted(int32_t elapsed, int32_t frame_ticks, uint32_t frame_rate) {
  return (int)((int64_t)elapsed * TweenFramesPerGameFrame(frame_ticks, frame_rate) / frame_ticks);
}

static int IsFrameBetween(int frame, int32_t frame_ticks, uint32_t frame_rate) {
  return frame < TweenFramesPerGameFrame(frame_ticks, frame_rate);
}

/* whether to draw a frame between now, elapsed ticks into a game frame, with time to draw it (draw_ticks) */
int TweenFrameDue(const tween_pacer *p, int32_t elapsed, int32_t frame_ticks,
  uint32_t frame_rate, int32_t draw_ticks) {
  int started;

  if (elapsed + draw_ticks >= frame_ticks) { return 0; }
  started = FramesBetweenStarted(elapsed, frame_ticks, frame_rate);
  return started > p->drawn && IsFrameBetween(started, frame_ticks, frame_rate);
}

/* a frame was drawn between game frames, elapsed ticks in: it (and any it was too late for) are done */
void TweenPacerDrew(tween_pacer *p, int32_t elapsed, int32_t frame_ticks, uint32_t frame_rate) {
  p->drawn = FramesBetweenStarted(elapsed, frame_ticks, frame_rate);
}

/* move on to the next game frame, whose frames between start afresh */
void TweenPacerNextGameFrame(tween_pacer *p) {
  p->drawn = 0;
}
