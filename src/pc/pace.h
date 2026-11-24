#ifndef _PC_PACE_H_
#define _PC_PACE_H_

#include "common.h"
#include "ns.h"
#include "pc/time.h"

/*
 * how long a frame lasts, in ticks (pc). the game draws a frame every two
 * vblanks, which on an ntsc ps1 is 30000 frames every 1001 seconds (29.97
 * fps): 34.49 ticks, so frames are 34 and 35 ticks long, each frame's from
 * its number so they never drift. the PS1 couldn't keep that up in the lab
 * intro, a heavy scene, and the intro moves on a step a frame, so at a steady
 * 30 fps it ran a fifth fast: 36 s, against 45 s in a recording of the PS1's
 * intro. it's drawn here at the pace the PS1 managed, in sections (one for
 * now: a frame every two and three vblanks in turn, 24 fps), with vblanks as
 * the game counts them
 */
#define FRAME_TICKS  34 /* two vblanks, as the game counts them */
#define VBLANK_TICKS 17

#define NTSC_FRAMES  30000LL /* two-vblank frames ... */
#define NTSC_SECONDS 1001LL  /* ... in this many seconds */

static inline int64_t NtscTicksToFrame(uint32_t frame) {
  return frame * (PS1_CPU_HZ * NTSC_SECONDS) / (TICK_CYCLES * NTSC_FRAMES);
}

/* the ticks a game frame lasts, at the ps1's 29.97 a second */
static inline int32_t GameFrameTicks(uint32_t frame) {
  return (int32_t)(NtscTicksToFrame(frame+1) - NtscTicksToFrame(frame));
}

typedef struct {
  uint32_t end_frame; /* the section runs up to this frame */
  uint32_t vblanks;   /* vblanks it takes ... */
  uint32_t frames;    /* ... to draw this many frames */
} pace_section;

static const pace_section intro_pace[] = {
  { 0xFFFFFFFF, 5, 2 }, /* 2.5 vblanks a frame (24 fps), all the way through */
};

/* vblanks the first n frames of a section take */
static inline uint32_t PaceVblanks(const pace_section *section, uint32_t n) {
  return n * section->vblanks / section->frames;
}

/* the ticks the intro's frame lasts, at the pace the ps1 managed */
static inline int32_t IntroFrameTicks(uint32_t frame) {
  const pace_section *section;
  uint32_t start, i, n;

  start = 0;
  for (i = 0; i < sizeof(intro_pace)/sizeof(intro_pace[0]); i++) {
    section = &intro_pace[i];
    if (frame < section->end_frame) {
      n = frame - start;
      return (PaceVblanks(section, n+1) - PaceVblanks(section, n)) * VBLANK_TICKS;
    }
    start = section->end_frame;
  }
  return FRAME_TICKS;
}

static inline int32_t FrameTicks(lid_t lid, uint32_t frame) {
  if (lid == LID_INTRO) { return IntroFrameTicks(frame); }
  return GameFrameTicks(frame);
}

/*
 * how long a demo's frame waits: as long as the ps1's did when it was
 * recorded, from the last frame's recorded time (the draw stamp) to this one's
 */
static inline int32_t DemoFrameTicks(int32_t recorded_ticks, int32_t draw_stamp) {
  if (recorded_ticks < draw_stamp) { return 0; }
  return recorded_ticks - draw_stamp;
}

#endif /* _PC_PACE_H_ */
