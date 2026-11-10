#ifndef _PC_FRAMES_H_
#define _PC_FRAMES_H_

#include "common.h"

#define FRAME_TICKS_PER_FRAME 34 /* game clock ticks in a game frame (30 a second) */

/*
 * frames counted as already elapsed when c1x starts. a ps1's count started at
 * boot, so by the first level (bios, splash screens, title, map) it was well
 * on; c1x's clock starts at 0, and booting straight into a level would
 * otherwise spawn crash with no spin charge (frames_elapsed - his spin stamp,
 * which starts at 0, capped at 300 frames). 30 seconds
 */
#define FRAMES_AT_START (30 * 30)

/* game frames elapsed (frames_elapsed), from the game clock's draw stamp */
static inline uint32_t GameFramesElapsed(uint32_t draw_stamp) {
  return FRAMES_AT_START + (draw_stamp / FRAME_TICKS_PER_FRAME);
}

#endif /* _PC_FRAMES_H_ */
