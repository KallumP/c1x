#ifndef _PC_VOICE_H_
#define _PC_VOICE_H_

#include "common.h"

/*
 * when a delayed audio voice keys on (pc). a voice created with AudioControl
 * op 7 waits key_on_frames updates (the lab intro uses it to start each of
 * its voice lines in turn), then its delay (op 4, 1 by default). the
 * decompiled AudioUpdate only counted down the delay, so every line of the
 * intro started at once
 */
static inline int VoiceDelayElapsed(uint16_t *key_on_frames, int8_t *delay) {
  if (*key_on_frames) {
    --*key_on_frames;
    return 0;
  }
  return --*delay == 0;
}

#endif /* _PC_VOICE_H_ */
