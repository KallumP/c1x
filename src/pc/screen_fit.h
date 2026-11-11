#ifndef _PC_SCREEN_FIT_H_
#define _PC_SCREEN_FIT_H_

/* where in the window the game's picture is drawn, in pixels from the bottom left */
typedef struct {
  int x, y, w, h;
} screen_area;

extern void FitPicture(int window_w, int window_h, screen_area *area);

#endif /* _PC_SCREEN_FIT_H_ */
