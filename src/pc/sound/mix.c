#include "mix.h"

static int16_t ClipToSampleRange(int32_t value) {
  if (value > INT16_MAX) { return INT16_MAX; }
  if (value < INT16_MIN) { return INT16_MIN; }
  return (int16_t)value;
}

/* converts the sum of all voices to an output sample */
int16_t SwMixToSample(int32_t mixed) {
  return ClipToSampleRange(mixed / MIX_HEADROOM);
}
