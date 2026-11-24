#include "pc/tween.h"
#include "pc/time.h"

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
 * a game frame's frames are spaced evenly: its own, then the frames between.
 * a game frame of frame_ticks is frame_ticks x frame_rate x TICK_CYCLES /
 * PS1_CPU_HZ frames' worth at frame_rate (pc/time.h), rounded to
 * whole frames. spacing them inside each game frame, rather than on a
 * frame_rate clock of their own, keeps them evenly apart: game frames aren't
 * quite 1/30 s, so a clock of their own would drift across them.
 *
 * they're spaced by when they're shown, from when the game frame's own was
 * (shown_ticks into it): a frame between takes longer to show than the game
 * frame's own, which was worked out before the wait, so it starts that much
 * earlier (draw_ticks, how long one takes to show)
 */
void TweenPacerReset(tween_pacer *p) {
  p->drawn = 0;
  p->shown_ticks = 0;
}

/* how many frames a game frame of frame_ticks has at frame_rate, its own included (at least 1) */
int TweenFramesPerGameFrame(int32_t frame_ticks, uint32_t frame_rate) {
  int64_t units;
  int frames;

  units = (int64_t)frame_ticks * frame_rate * TICK_CYCLES;
  frames = (int)((units + PS1_CPU_HZ / 2) / PS1_CPU_HZ);
  if (frames < 1) { return 1; }
  return frames;
}

/* how far after the game frame's own a frame between started now would be shown */
static int32_t ShownAfterGameFrame(const tween_pacer *p, int32_t elapsed, int32_t draw_ticks) {
  return elapsed + draw_ticks - p->shown_ticks;
}

/* the frames between due to be shown by ticks after the game frame's own (the kth is k/frames of the way) */
static int FramesBetweenStarted(int32_t ticks, int32_t frame_ticks, uint32_t frame_rate) {
  if (ticks < 0) { return 0; }
  return (int)((int64_t)ticks * TweenFramesPerGameFrame(frame_ticks, frame_rate) / frame_ticks);
}

static int IsFrameBetween(int frame, int32_t frame_ticks, uint32_t frame_rate) {
  return frame < TweenFramesPerGameFrame(frame_ticks, frame_rate);
}

/* whether to start a frame between now, elapsed ticks into a game frame, one taking draw_ticks to show */
int TweenFrameDue(const tween_pacer *p, int32_t elapsed, int32_t frame_ticks,
  uint32_t frame_rate, int32_t draw_ticks) {
  int started;

  if (elapsed + draw_ticks >= frame_ticks) { return 0; } /* no time to show it before the game frame */
  started = FramesBetweenStarted(ShownAfterGameFrame(p, elapsed, draw_ticks), frame_ticks, frame_rate);
  return started > p->drawn && IsFrameBetween(started, frame_ticks, frame_rate);
}

/* a frame between was started, elapsed ticks in: it (and any it was too late for) are done */
void TweenPacerDrew(tween_pacer *p, int32_t elapsed, int32_t frame_ticks, uint32_t frame_rate,
  int32_t draw_ticks) {
  p->drawn = FramesBetweenStarted(ShownAfterGameFrame(p, elapsed, draw_ticks), frame_ticks, frame_rate);
}

/* move on to the next game frame, its own shown shown_ticks into it: its frames between start afresh */
void TweenPacerNextGameFrame(tween_pacer *p, int32_t shown_ticks) {
  p->drawn = 0;
  p->shown_ticks = shown_ticks;
}
