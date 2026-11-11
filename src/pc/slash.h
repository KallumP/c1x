#ifndef _PC_SLASH_H_
#define _PC_SLASH_H_

#include "common.h"

/*
 * a '/' for the hud's digits (pc), which have no slash of their own: a stroke
 * leaning right, shaded from orange at the top to red at the bottom with a
 * black outline, as the digits are. an rgba image, rows from the top
 */
#define SLASH_WIDTH  32
#define SLASH_HEIGHT 64

extern void SlashImage(uint8_t *rgba);

#endif /* _PC_SLASH_H_ */
