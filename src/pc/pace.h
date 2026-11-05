#ifndef _PC_PACE_H_
#define _PC_PACE_H_

#include "common.h"
#include "ns.h"

/*
 * how long a frame lasts, in ticks (pc). the game draws a frame every two
 * vblanks (30 fps). the PS1 couldn't keep that up in the lab intro, a heavy
 * scene, and the intro moves on a step a frame, so at a steady 30 fps it
 * ran a fifth fast: 36 s, against 45 s in a recording of the PS1's intro.
 * it's drawn here at the pace the PS1 managed, in sections (one for now:
 * a frame every two and three vblanks in turn, 24 fps)
 */
#define FRAME_TICKS  34 /* two vblanks */
#define VBLANK_TICKS 17

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

static inline int32_t FrameTicks(lid_t lid, uint32_t frame) {
  const pace_section *section;
  uint32_t start, i, n;

  if (lid != LID_INTRO) { return FRAME_TICKS; }
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

#endif /* _PC_PACE_H_ */
