#ifndef _PC_GFX_MAGNITUDE_H_
#define _PC_GFX_MAGNITUDE_H_

#include <stdint.h>

/*
 * squared magnitudes of a vector, scaled down (by 2^13 for 2 components,
 * 2^20 for 3). the audio code uses them for how far a sound is from the
 * camera, so how loud it plays
 */
static inline uint32_t SwSqrMagnitude2(int32_t a, int32_t b) {
  return ((int64_t)a*a+b*b) >> 13;
}

static inline uint32_t SwSqrMagnitude3(int32_t a, int32_t b, int32_t c) {
  return ((int64_t)a*a+b*b+c*c) >> 20;
}

#endif /* _PC_GFX_MAGNITUDE_H_ */
