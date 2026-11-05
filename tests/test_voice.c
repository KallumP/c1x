#include "utest.h"
#include "pc/voice.h"

/* how many updates a delayed voice waits before it's due, with frames
   alternately first_ticks and second_ticks long */
static int UpdatesUntilDueAlternating(uint16_t key_on_frames, int8_t delay,
  int32_t first_ticks, int32_t second_ticks) {
  int32_t waited;
  int updates;

  waited = 0;
  for (updates = 1; updates < 10000; updates++) {
    if (VoiceDelayElapsed(waited, key_on_frames, &delay))
      return updates;
    waited += (updates & 1) ? first_ticks : second_ticks;
  }
  return -1;
}

/* the same, at 30 fps */
static int UpdatesUntilDue(uint16_t key_on_frames, int8_t delay) {
  return UpdatesUntilDueAlternating(key_on_frames, delay, VOICE_FRAME_TICKS, VOICE_FRAME_TICKS);
}

UTEST(voice, a_delayed_voice_with_no_key_on_frame_is_due_once_its_delay_runs_out) {
  ASSERT_EQ(1, UpdatesUntilDue(0, 1));
  ASSERT_EQ(3, UpdatesUntilDue(0, 3));
}

UTEST(voice, a_delayed_voice_waits_out_its_key_on_frame_first) {
  ASSERT_EQ(16, UpdatesUntilDue(15, 1));
  ASSERT_EQ(817, UpdatesUntilDue(816, 1));
}

UTEST(voice, a_key_on_frame_is_a_30_fps_frame_of_game_time_however_long_frames_take) {
  /* drawing a frame every 2 and 3 vblanks in turn (34 and 51 ticks), 147
     30 fps frames (4998 ticks) have passed after 118 frames */
  ASSERT_EQ(119, UpdatesUntilDueAlternating(147, 1, 34, 51));
}

UTEST(voice, the_intros_voice_lines_start_in_turn) {
  uint16_t frames[5] = { 15, 147, 450, 585, 816 }; /* as the lab intro sets them */
  int i;

  for (i = 1; i < 5; i++)
    ASSERT_LT(UpdatesUntilDue(frames[i-1], 1), UpdatesUntilDue(frames[i], 1));
}

/* how many updates a playing voice lasts before its sustain stops it, or -1 if it doesn't */
static int UpdatesUntilStopped(int keyed_on_by_frame, int8_t sustain) {
  int updates;

  for (updates = 1; updates < 10000; updates++) {
    if (VoiceSustainEnded(keyed_on_by_frame, &sustain))
      return updates;
  }
  return -1;
}

UTEST(voice, a_sound_stops_when_its_sustain_runs_out) {
  ASSERT_EQ(96, UpdatesUntilStopped(0, 96));
  ASSERT_EQ(128, UpdatesUntilStopped(0, (int8_t)128)); /* the default, -128 as a signed byte */
}

UTEST(voice, a_voice_keyed_on_by_frame_plays_to_the_end_of_its_sample) {
  ASSERT_EQ(-1, UpdatesUntilStopped(1, (int8_t)128)); /* the intro's lines run past 128 frames */
}

UTEST(voice, the_intros_first_line_starts_straight_away) {
  ASSERT_EQ(0, VoiceKeyOnFrames(LID_INTRO, 15));
}

UTEST(voice, every_other_key_on_frame_is_kept) {
  ASSERT_EQ(147, VoiceKeyOnFrames(LID_INTRO, 147));
  ASSERT_EQ(15, VoiceKeyOnFrames(LID_TITLE, 15));
  ASSERT_EQ(0, VoiceKeyOnFrames(LID_INTRO, 0));
}
