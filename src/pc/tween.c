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
 * slots are timed in units of ticks x frame_rate x 0x8000: the clock runs at
 * 34000000/0x8000 ticks a second (pc/time.c), so a slot (1/frame_rate of a
 * second) is TWEEN_SLOT_UNITS of them, at any frame rate
 */
#define TWEEN_SLOT_UNITS 34000000

static int64_t SlotUnitsPerTick(uint32_t frame_rate) {
  return (int64_t)frame_rate * 0x8000;
}

/* the smallest whole number of slots at or past units (which may be negative) */
static int64_t SlotsCeil(int64_t units) {
  if (units <= 0) { return -((-units) / TWEEN_SLOT_UNITS); }
  return (units + TWEEN_SLOT_UNITS - 1) / TWEEN_SLOT_UNITS;
}

void TweenPacerReset(tween_pacer *p) {
  p->phase = 0;
  p->drawn = 0;
}

/* how many ticks into the game frame the slot starts */
int32_t TweenSlotTicks(const tween_pacer *p, int slot, uint32_t frame_rate) {
  int64_t units, per_tick;

  units = ((int64_t)slot * TWEEN_SLOT_UNITS) - p->phase;
  per_tick = SlotUnitsPerTick(frame_rate);
  return (int32_t)((units + per_tick - 1) / per_tick);
}

/* the last slot started by elapsed ticks into the game frame (0: none since the game frame) */
int TweenSlotsDue(const tween_pacer *p, int32_t elapsed, uint32_t frame_rate) {
  int64_t units;

  units = p->phase + ((int64_t)elapsed * SlotUnitsPerTick(frame_rate));
  if (units < TWEEN_SLOT_UNITS) { return 0; }
  return (int)(units / TWEEN_SLOT_UNITS);
}

int TweenFrameDue(const tween_pacer *p, int32_t elapsed, int32_t frame_ticks,
  uint32_t frame_rate, int32_t draw_ticks) {
  int slot;

  if (elapsed + draw_ticks >= frame_ticks) { return 0; }
  slot = TweenSlotsDue(p, elapsed, frame_rate);
  return slot > p->drawn && TweenSlotTicks(p, slot, frame_rate) < frame_ticks;
}

/* a frame was drawn between game frames, elapsed ticks in: its slot (and any missed) are done */
void TweenPacerDrew(tween_pacer *p, int32_t elapsed, uint32_t frame_rate) {
  p->drawn = TweenSlotsDue(p, elapsed, frame_rate);
}

/*
 * the slot the next game frame's own frame takes, the game frame being end
 * units in: the last one started by then if it wasn't drawn (too late in the
 * game frame to draw), else the next one
 */
static int64_t GameFrameSlot(const tween_pacer *p, int64_t end) {
  int64_t started;

  started = SlotsCeil(end);
  if (started * TWEEN_SLOT_UNITS > end)
    started--; /* the last started, not the next */
  if (started > p->drawn) { return started; }
  return SlotsCeil(end);
}

/*
 * move on to the next game frame, frame_ticks after this one. its own frame
 * takes a slot, and the time from that slot carries over, so the slots don't
 * start afresh (and round up) each game frame
 */
void TweenPacerNextGameFrame(tween_pacer *p, int32_t frame_ticks, uint32_t frame_rate) {
  int64_t end;

  end = p->phase + ((int64_t)frame_ticks * SlotUnitsPerTick(frame_rate));
  p->phase = end - (GameFrameSlot(p, end) * TWEEN_SLOT_UNITS);
  p->drawn = 0;
}
