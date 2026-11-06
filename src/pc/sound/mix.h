#ifndef _PC_MIX_H_
#define _PC_MIX_H_

#include <stdint.h>

/* the summed voices are divided by this before output; it keeps the music
   voice (gain 8) and sound effect voices (gain 1) in the same balance as
   the old divide-by-24 mix, only 8x louder */
#define MIX_HEADROOM 3

extern int16_t SwMixToSample(int32_t mixed);

#endif /* _PC_MIX_H_ */
