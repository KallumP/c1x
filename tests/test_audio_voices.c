#include <string.h>
#include "utest.h"
#include "pc/sound/audio.h"

#define VOICE        3
#define HEADER_SIZE  32 /* a sound entry's header, before its adpcm lines */
#define ADPCM_LINES  4
#define ADPCM_LINE   16

/* a voice given a short silent sound, as the game loads one; no audio device is open */
static void LoadSilentSample(int voice_idx) {
  static uint8_t entry[HEADER_SIZE + ADPCM_LINES*ADPCM_LINE];

  memset(entry, 0, sizeof(entry));
  SwLoadSample(voice_idx, entry, sizeof(entry));
}

UTEST(audio_voices, loading_a_sample_gives_the_voice_it) {
  LoadSilentSample(VOICE);
  ASSERT_TRUE(SwVoiceHasSample(VOICE));
  SwUnloadSample(VOICE);
}

/* the audio thread mixes any sample a voice has, so it can't be a freed one */
UTEST(audio_voices, an_unloaded_voice_has_no_sample) {
  LoadSilentSample(VOICE);
  SwUnloadSample(VOICE);
  ASSERT_FALSE(SwVoiceHasSample(VOICE));
}

/* every level change kills the audio */
UTEST(audio_voices, killing_the_audio_unloads_every_voices_sample) {
  LoadSilentSample(VOICE);
  SwAudioKill();
  ASSERT_FALSE(SwVoiceHasSample(VOICE));
}
