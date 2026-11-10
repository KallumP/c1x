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
