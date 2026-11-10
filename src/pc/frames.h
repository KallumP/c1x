#ifndef _PC_FRAMES_H_
#define _PC_FRAMES_H_

#include "common.h"

#define FRAME_TICKS_PER_FRAME 34 /* game clock ticks in a game frame (30 a second) */

/* game frames elapsed (frames_elapsed), from the game clock's draw stamp */
static inline uint32_t GameFramesElapsed(uint32_t draw_stamp) {
  return draw_stamp / FRAME_TICKS_PER_FRAME;
}

#endif /* _PC_FRAMES_H_ */
