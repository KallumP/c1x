#ifndef _PC_VOICE_H_
#define _PC_VOICE_H_

#include "common.h"
#include "ns.h"

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

/*
 * whether a playing voice's sustain has run out, so it stops (pc). a voice
 * keyed on by frame (the intro's voice lines) plays to the end of its
 * sample: they're up to 10 s long, and the default sustain (128 updates,
 * about 4 s) cut them off
 */
#define VOICE_KEYED_ON_BY_FRAME 0x1000 /* pc: voice flag, set when it's created with a key-on frame */

static inline int VoiceSustainEnded(int keyed_on_by_frame, int8_t *sustain) {
  if (keyed_on_by_frame) { return 0; }
  return --*sustain == 0;
}

/*
 * the frame a voice keys on (pc), with the lab intro's first line brought
 * about 300 ms sooner, as tuned by ear against the scene; the rest keep the
 * frames the intro gives them
 */
#define INTRO_FIRST_LINE_FRAME 15
#define INTRO_FIRST_LINE_LEAD  9 /* frames at 30 fps */

static inline uint16_t VoiceKeyOnFrames(lid_t lid, uint16_t frames) {
  if (lid == LID_INTRO && frames == INTRO_FIRST_LINE_FRAME)
    return frames - INTRO_FIRST_LINE_LEAD;
  return frames;
}

#endif /* _PC_VOICE_H_ */
