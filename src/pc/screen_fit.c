/*
 * fitting the game's picture (4:3, as on a tv) into the window, as big as
 * it goes, with black bars at the sides or top and bottom for the rest
 */
#include "screen_fit.h"

#define PICTURE_ASPECT_W 4
#define PICTURE_ASPECT_H 3

/* whether the window is wider than the picture, for its height */
static int IsWiderThanPicture(int window_w, int window_h) {
  return window_w * PICTURE_ASPECT_H > window_h * PICTURE_ASPECT_W;
}

void FitPicture(int window_w, int window_h, screen_area *area) {
  if (IsWiderThanPicture(window_w, window_h)) {
    area->h = window_h;
    area->w = (window_h * PICTURE_ASPECT_W) / PICTURE_ASPECT_H;
  } else {
    area->w = window_w;
    area->h = (window_w * PICTURE_ASPECT_H) / PICTURE_ASPECT_W;
  }
  area->x = (window_w - area->w) / 2;
  area->y = (window_h - area->h) / 2;
}
