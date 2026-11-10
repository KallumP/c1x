#include <string.h>
#include "utest.h"
#include "pc/replay.h"
#include "pc/pad.h"
#include "pc/time.h"
#include "pc/pace.h"
#include "test_files.h"

#define TEST_REPLAY "build/test_replay.inputs"
#define RECORDED_LEVEL 0x19 /* any level id; the replay must start in the same one */
#define OTHER_LEVEL    0x09
#define RECORDED_SEED  12345

extern uint8_t keys[512]; /* defined in test_pad.c */

/* read back a recording's header and up to max frames; returns the frame count */
static int ReadRecording(replay_header *header, replay_frame *frames, int max) {
  FILE *file;
  int count;

  file = fopen(TEST_REPLAY, "rb");
  if (!file) { return -1; }
  if (fread(header, sizeof(replay_header), 1, file) != 1) { fclose(file); return -1; }
  count = (int)fread(frames, sizeof(replay_frame), max, file);
  fclose(file);
  return count;
}

UTEST(replay, start_recording_fixes_the_clock_and_writes_the_header) {
  replay_header header;
  replay_frame frames[1];

  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_RECORD, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_TRUE(TimeIsFixed());
  ReplayStop();
  ASSERT_EQ(0, ReadRecording(&header, frames, 1));
  ASSERT_EQ((uint32_t)REPLAY_MAGIC, header.magic);
  ASSERT_EQ((uint32_t)RECORDED_LEVEL, header.lid);
  ASSERT_EQ((uint32_t)RECORDED_SEED, header.seed);
}

UTEST(replay, each_update_records_the_clock_and_the_buttons_held) {
  replay_header header;
  replay_frame frames[3];
  int32_t start;

  memset(keys, 0, sizeof(keys));
  PadResetBindings();
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_RECORD, RECORDED_LEVEL, RECORDED_SEED));
  start = GetTicksElapsed();
  keys[SDL_SCANCODE_Z] = 1;
  ReplayUpdate();
  keys[SDL_SCANCODE_Z] = 0;
  TimeAdvance(FRAME_TICKS);
  ReplayUpdate();
  ReplayStop();
  ASSERT_EQ(2, ReadRecording(&header, frames, 3));
  ASSERT_EQ(start, header.start_ticks);
  ASSERT_EQ(start, frames[0].ticks);
  ASSERT_EQ((uint32_t)PAD_CROSS << 16, frames[0].held);
  ASSERT_EQ(start + FRAME_TICKS, frames[1].ticks);
  ASSERT_EQ(0u, frames[1].held);
}

UTEST(replay, stopping_goes_back_to_the_real_clock) {
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_RECORD, RECORDED_LEVEL, RECORDED_SEED));
  ReplayStop();
  ASSERT_FALSE(TimeIsFixed());
}

/* record frames holding each of held[] in turn */
static void Record(uint32_t lid, SDL_Scancode *held, int count) {
  int i;

  memset(keys, 0, sizeof(keys));
  PadResetBindings();
  ReplayStart(TEST_REPLAY, REPLAY_RECORD, lid, RECORDED_SEED);
  for (i=0;i<count;i++) {
    memset(keys, 0, sizeof(keys));
    if (held[i]) { keys[held[i]] = 1; }
    ReplayUpdate();
    TimeWaitFrame(FRAME_TICKS);
  }
  ReplayStop();
  memset(keys, 0, sizeof(keys));
}

UTEST(replay, replay_feeds_the_recorded_buttons_instead_of_the_keyboard) {
  SDL_Scancode held[2] = { SDL_SCANCODE_Z, 0 };

  Record(RECORDED_LEVEL, held, 2);
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  keys[SDL_SCANCODE_LEFT] = 1; /* ignored while replaying */
  ReplayUpdate();
  ASSERT_EQ((uint32_t)PAD_CROSS << 16, SwPadRead(0));
  TimeWaitFrame(FRAME_TICKS);
  ReplayUpdate();
  ASSERT_EQ(0u, SwPadRead(0));
  ReplayStop();
  keys[SDL_SCANCODE_LEFT] = 0;
}

UTEST(replay, replay_starts_on_the_fixed_clock_at_the_recorded_time) {
  SDL_Scancode held[1] = { 0 };
  replay_header header;
  replay_frame frames[1];

  Record(RECORDED_LEVEL, held, 1);
  ASSERT_EQ(1, ReadRecording(&header, frames, 1));
  SetTicksElapsed(header.start_ticks + 1000);
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_TRUE(TimeIsFixed());
  ASSERT_EQ(header.start_ticks, GetTicksElapsed());
  ReplayStop();
}

UTEST(replay, keyboard_and_real_clock_take_over_at_the_end_of_the_recording) {
  SDL_Scancode held[1] = { SDL_SCANCODE_Z };

  Record(RECORDED_LEVEL, held, 1);
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  ReplayUpdate(); /* the only recorded frame */
  ASSERT_EQ((uint32_t)PAD_CROSS << 16, SwPadRead(0));
  TimeWaitFrame(FRAME_TICKS);
  keys[SDL_SCANCODE_LEFT] = 1;
  ReplayUpdate(); /* past the end */
  ASSERT_EQ((uint32_t)PAD_LEFT << 16, SwPadRead(0));
  ASSERT_FALSE(TimeIsFixed());
  keys[SDL_SCANCODE_LEFT] = 0;
}

UTEST(replay, ending_a_replay_goes_back_to_normal_speed) {
  SDL_Scancode held[1] = { 0 };

  Record(RECORDED_LEVEL, held, 1);
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  TimeSetSpeed(8);
  ReplayUpdate(); /* the only recorded frame */
  ReplayUpdate(); /* past the end */
  ASSERT_EQ(1u, TimeGetSpeed());
}

UTEST(replay, is_playing_only_while_replaying) {
  SDL_Scancode held[1] = { 0 };

  Record(RECORDED_LEVEL, held, 1);
  ASSERT_FALSE(ReplayIsPlaying());
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_RECORD, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_FALSE(ReplayIsPlaying()); /* recording isn't replaying */
  ReplayStop();
  ASSERT_EQ(1, ReplayStart(TEST_REPLAY, REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_TRUE(ReplayIsPlaying());
  ReplayUpdate(); /* nothing recorded, so this is past the end */
  ASSERT_FALSE(ReplayIsPlaying());
}

UTEST(replay, replay_refuses_a_recording_from_another_boot_level) {
  SDL_Scancode held[1] = { 0 };

  Record(RECORDED_LEVEL, held, 1);
  ASSERT_EQ(0, ReplayStart(TEST_REPLAY, REPLAY_PLAY, OTHER_LEVEL, RECORDED_SEED));
  ASSERT_FALSE(TimeIsFixed());
}

UTEST(replay, replay_of_a_missing_file_fails_cleanly) {
  remove("build/no_such_file.inputs");
  ASSERT_EQ(0, ReplayStart("build/no_such_file.inputs", REPLAY_PLAY, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_FALSE(TimeIsFixed());
}

#define TEST_REC_DIR "build/test_recorded_inputs"

static void TouchFile(const char *name) {
  char path[256];

  snprintf(path, sizeof(path), "%s/%s", TEST_REC_DIR, name);
  WriteWholeFile(path, "");
}

static void RemoveFile(const char *name) {
  char path[256];

  snprintf(path, sizeof(path), "%s/%s", TEST_REC_DIR, name);
  remove(path);
}

UTEST(replay, file_name_starts_with_the_start_time) {
  struct tm t = { 0 };
  char name[64];

  t.tm_year = 2026 - 1900; t.tm_mon = 9; t.tm_mday = 30;
  t.tm_hour = 14; t.tm_min = 5; t.tm_sec = 9;
  ReplayFileName(name, sizeof(name), "recorded_inputs", &t);
  ASSERT_STREQ("recorded_inputs/2026-10-30_14-05-09.inputs", name);
}

UTEST(replay, newest_file_is_the_latest_start_time) {
  char path[256];

  ASSERT_EQ(1, ReplayMakeDir(TEST_REC_DIR));
  TouchFile("2026-10-30_14-05-09.inputs");
  TouchFile("2026-11-02_08-00-00.inputs");
  TouchFile("2026-10-31_23-59-59.inputs");
  TouchFile("zzz.txt"); /* not a recording */
  ASSERT_EQ(1, ReplayNewestFile(TEST_REC_DIR, path, sizeof(path)));
  ASSERT_STREQ(TEST_REC_DIR "/2026-11-02_08-00-00.inputs", path);
  RemoveFile("2026-10-30_14-05-09.inputs");
  RemoveFile("2026-11-02_08-00-00.inputs");
  RemoveFile("2026-10-31_23-59-59.inputs");
  RemoveFile("zzz.txt");
}

UTEST(replay, no_newest_file_in_an_empty_or_missing_folder) {
  char path[256];

  ASSERT_EQ(1, ReplayMakeDir(TEST_REC_DIR));
  ASSERT_EQ(0, ReplayNewestFile(TEST_REC_DIR, path, sizeof(path)));
  ASSERT_EQ(0, ReplayNewestFile("build/no_such_folder", path, sizeof(path)));
}

UTEST(replay, making_a_folder_that_exists_is_fine) {
  ASSERT_EQ(1, ReplayMakeDir(TEST_REC_DIR));
  ASSERT_EQ(1, ReplayMakeDir(TEST_REC_DIR));
}

UTEST(replay, start_fails_cleanly_for_a_bad_path) {
  ASSERT_EQ(0, ReplayStart("build/no/such/dir/test.inputs", REPLAY_RECORD, RECORDED_LEVEL, RECORDED_SEED));
  ASSERT_FALSE(TimeIsFixed());
}
