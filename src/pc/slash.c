/*
 * the hud's slash image (pc), see slash.h
 */
#include "slash.h"

#define SLASH_BOTTOM_X     (SLASH_WIDTH * 0.15f) /* the stroke runs from here at the bottom */
#define SLASH_TOP_X        (SLASH_WIDTH * 0.85f) /* to here at the top */
#define SLASH_HALF_STROKE  4.0f                  /* the stroke's half width, in pixels */
#define SLASH_OUTLINE      2                     /* the outline's width, in pixels */

typedef struct { uint8_t r, g, b; } slash_colour;

static const slash_colour slash_top    = { 255, 190, 0 };  /* the digits' orange */
static const slash_colour slash_bottom = { 225, 30,  0 };  /* and red */
static const slash_colour slash_black  = { 0,   0,   0 };

/* is the centre of pixel x, y within reach of the stroke's middle line? (squared, so no sqrt) */
static int SlashWithin(int x, int y, float reach) {
  float dx, dy, px, py, cross;

  dx = SLASH_TOP_X - SLASH_BOTTOM_X;
  dy = -(float)SLASH_HEIGHT;
  px = (x + 0.5f) - SLASH_BOTTOM_X;
  py = (y + 0.5f) - SLASH_HEIGHT;
  cross = (px * dy) - (py * dx);
  return (cross * cross) <= (reach * reach) * ((dx * dx) + (dy * dy));
}

/* is row y away from the top and bottom ends, where the outline closes the stroke? */
static int SlashInsideEnds(int y) {
  return y >= SLASH_OUTLINE && y < SLASH_HEIGHT - SLASH_OUTLINE;
}

/* the stroke's colour on row y: orange at the top to red at the bottom */
static slash_colour SlashShade(int y) {
  slash_colour c;
  float t;

  t = (float)y / (SLASH_HEIGHT - 1);
  c.r = (uint8_t)(slash_top.r + ((slash_bottom.r - slash_top.r) * t));
  c.g = (uint8_t)(slash_top.g + ((slash_bottom.g - slash_top.g) * t));
  c.b = (uint8_t)(slash_top.b + ((slash_bottom.b - slash_top.b) * t));
  return c;
}

static void SlashSetPixel(uint8_t *pixel, slash_colour c, uint8_t alpha) {
  pixel[0] = c.r;
  pixel[1] = c.g;
  pixel[2] = c.b;
  pixel[3] = alpha;
}

/* colour one pixel: the stroke, its outline, or clear */
static void SlashPaintPixel(uint8_t *pixel, int x, int y) {
  if (SlashWithin(x, y, SLASH_HALF_STROKE) && SlashInsideEnds(y))
    SlashSetPixel(pixel, SlashShade(y), 255);
  else if (SlashWithin(x, y, SLASH_HALF_STROKE + SLASH_OUTLINE))
    SlashSetPixel(pixel, slash_black, 255);
  else
    SlashSetPixel(pixel, slash_black, 0);
}

/* draw the slash into rgba: SLASH_WIDTH by SLASH_HEIGHT pixels, 4 bytes each */
void SlashImage(uint8_t *rgba) {
  int x, y;

  for (y = 0; y < SLASH_HEIGHT; y++) {
    for (x = 0; x < SLASH_WIDTH; x++)
      SlashPaintPixel(&rgba[((y * SLASH_WIDTH) + x) * 4], x, y);
  }
}
