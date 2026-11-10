#ifndef _PC_FPS_H_
#define _PC_FPS_H_

#include "common.h"

/* frames drawn a second (pc), counted a second at a time */
typedef struct {
  uint32_t start_ms; /* when the second being counted started */
  uint32_t count;    /* frames drawn since then */
  uint32_t fps;      /* frames a second over the last whole second */
} fps_counter;

extern void FpsReset(fps_counter *c, uint32_t now_ms);
extern void FpsCountFrame(fps_counter *c, uint32_t now_ms);
extern uint32_t FpsGet(fps_counter *c);
extern void FpsCountShownFrame(uint32_t now_ms);
extern uint32_t FpsShown();

#endif /* _PC_FPS_H_ */
