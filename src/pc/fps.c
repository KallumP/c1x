#include "pc/fps.h"

void FpsReset(fps_counter *c, uint32_t now_ms) {
  c->start_ms = now_ms;
  c->count = 0;
  c->fps = 0;
}

/* count a frame drawn at now_ms; once a second is up, its count becomes the fps */
void FpsCountFrame(fps_counter *c, uint32_t now_ms) {
  uint32_t elapsed;

  c->count++;
  elapsed = now_ms - c->start_ms;
  if (elapsed < 1000) { return; }
  c->fps = (c->count * 1000) / elapsed;
  c->start_ms = now_ms;
  c->count = 0;
}

uint32_t FpsGet(fps_counter *c) {
  return c->fps;
}

/* the frames shown on screen (each swap), for the fps display */
static fps_counter shown = { 0, 0, 0 };

void FpsCountShownFrame(uint32_t now_ms) {
  FpsCountFrame(&shown, now_ms);
}

uint32_t FpsShown() {
  return FpsGet(&shown);
}
