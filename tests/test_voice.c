#include "utest.h"
#include "pc/voice.h"

/* how many updates a delayed voice waits before it's due */
static int UpdatesUntilDue(uint16_t key_on_frames, int8_t delay) {
  int updates;

  for (updates = 1; updates < 10000; updates++) {
    if (VoiceDelayElapsed(&key_on_frames, &delay))
      return updates;
  }
  return -1;
}

UTEST(voice, a_delayed_voice_with_no_key_on_frame_is_due_once_its_delay_runs_out) {
  ASSERT_EQ(1, UpdatesUntilDue(0, 1));
  ASSERT_EQ(3, UpdatesUntilDue(0, 3));
}

UTEST(voice, a_delayed_voice_waits_out_its_key_on_frame_first) {
  ASSERT_EQ(16, UpdatesUntilDue(15, 1));
  ASSERT_EQ(817, UpdatesUntilDue(816, 1));
}

UTEST(voice, the_intros_voice_lines_start_in_turn) {
  uint16_t frames[5] = { 15, 147, 450, 585, 816 }; /* as the lab intro sets them */
  int i;

  for (i = 1; i < 5; i++)
    ASSERT_LT(UpdatesUntilDue(frames[i-1], 1), UpdatesUntilDue(frames[i], 1));
}
