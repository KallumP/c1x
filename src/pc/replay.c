/*
 * input recording and replay (pc)
 */
#include <string.h>
#include <dirent.h>
#include <sys/stat.h>
#include "replay.h"
#include "pad.h"
#include "time.h"

/* start recording to path; returns 0 if the file can't be opened */
int ReplayRecordStart(replay_recorder *r, const char *path,
  replay_header *header) {
  r->file = fopen(path, "wb");
  if (!r->file) { return 0; }
  header->magic = REPLAY_MAGIC;
  fwrite(header, sizeof(replay_header), 1, r->file);
  return 1;
}

/* record one frame */
void ReplayRecordFrame(replay_recorder *r, int32_t ticks,
  const uint32_t held[PAD_PLAYER_COUNT]) {
  replay_frame frame;

  if (!r->file) { return; }
  frame.ticks = ticks;
  memcpy(frame.held, held, sizeof(frame.held));
  fwrite(&frame, sizeof(replay_frame), 1, r->file);
}

/* finish the recording */
void ReplayRecordStop(replay_recorder *r) {
  if (!r->file) { return; }
  fclose(r->file);
  r->file = 0;
}

/* name a recording by its start time, so names sort oldest to newest */
void ReplayFileName(char *name, size_t size, const char *dir,
  struct tm *start) {
  char stamp[32];

  strftime(stamp, sizeof(stamp), "%Y-%m-%d_%H-%M-%S", start);
  snprintf(name, size, "%s/%s.inputs", dir, stamp);
}

#define RECORDING_EXTENSION      ".inputs"
#define RECORDING_EXTENSION_SIZE (sizeof(RECORDING_EXTENSION)-1)
#define CARD_DIR_EXTENSION       ".card"
#define SETTINGS_FILE_EXTENSION  ".settings"

static int IsRecordingName(const char *name, size_t len) {
  return len >= RECORDING_EXTENSION_SIZE
    && strcmp(&name[len-RECORDING_EXTENSION_SIZE], RECORDING_EXTENSION) == 0;
}

static void ReplayBesidePath(char *path, size_t size, const char *recording_path,
  const char *extension) {
  size_t len;

  len = strlen(recording_path);
  if (IsRecordingName(recording_path, len))
    len -= RECORDING_EXTENSION_SIZE;
  snprintf(path, size, "%.*s%s", (int)len, recording_path, extension);
}

void ReplayCardDir(char *dir, size_t size, const char *recording_path) {
  ReplayBesidePath(dir, size, recording_path, CARD_DIR_EXTENSION);
}

void ReplaySettingsFile(char *path, size_t size, const char *recording_path) {
  ReplayBesidePath(path, size, recording_path, SETTINGS_FILE_EXTENSION);
}

/* find the newest recording in dir; returns 0 if there are none */
int ReplayNewestFile(const char *dir, char *path, size_t size) {
  DIR *d;
  struct dirent *e;
  char newest[256];
  size_t len;

  d = opendir(dir);
  if (!d) { return 0; }
  newest[0] = 0;
  while ((e = readdir(d))) {
    len = strlen(e->d_name);
    if (!IsRecordingName(e->d_name, len)) { continue; }
    if (len < sizeof(newest) && strcmp(e->d_name, newest) > 0)
      strcpy(newest, e->d_name);
  }
  closedir(d);
  if (!newest[0]) { return 0; }
  snprintf(path, size, "%s/%s", dir, newest);
  return 1;
}

/* make dir if it doesn't exist; returns 0 if it can't be made */
int ReplayMakeDir(const char *dir) {
  struct stat st;

#ifdef _WIN32
  mkdir(dir);
#else
  mkdir(dir, 0755);
#endif
  return stat(dir, &st) == 0 && S_ISDIR(st.st_mode);
}

/* 0 if it isn't a recording in this format */
static FILE *ReplayOpen(const char *path, replay_header *header) {
  FILE *file;

  file = fopen(path, "rb");
  if (!file) { return 0; }
  if (fread(header, sizeof(*header), 1, file) != 1 || header->magic != REPLAY_MAGIC) {
    fclose(file);
    return 0;
  }
  return file;
}

int ReplayCanPlay(const char *path) {
  replay_header header;
  FILE *file;

  file = ReplayOpen(path, &header);
  if (!file) { return 0; }
  fclose(file);
  return 1;
}

static replay_recorder recorder = { 0 };

static FILE *replay_file = 0;   /* recording being replayed, or 0 */
static uint32_t replay_held[PAD_PLAYER_COUNT] = { 0 };
static int replay_desynced = 0;

/*
 * start replaying the recording at path. it must have been made with the
 * same boot level and random seed, or it would play out differently
 */
static int ReplayPlayStart(const char *path, uint32_t lid, uint32_t seed) {
  replay_header header;
  FILE *file;

  file = ReplayOpen(path, &header);
  if (!file) {
    fprintf(stderr, "%s is not an input recording\n", path);
    return 0;
  }
  if (header.lid != lid || header.seed != seed) {
    fprintf(stderr, "%s was recorded with a different boot level or seed\n", path);
    fclose(file);
    return 0;
  }
  replay_file = file;
  memset(replay_held, 0, sizeof(replay_held));
  replay_desynced = 0;
  TimeSetFixed(1);
  SetTicksElapsed(header.start_ticks);
  return 1;
}

/*
 * start recording inputs to path (REPLAY_RECORD) or replaying them from it
 * (REPLAY_PLAY), on the fixed clock so that every read of game time is the
 * same on replay. returns 0 if the file can't be used
 */
int ReplayStart(const char *path, int mode, uint32_t lid, uint32_t seed) {
  replay_header header;

  if (mode == REPLAY_PLAY)
    return ReplayPlayStart(path, lid, seed);
  TimeSetFixed(1); /* first, so the start time is the one the clock stays at */
  header.lid = lid;
  header.seed = seed;
  header.start_ticks = GetTicksElapsed();
  if (!ReplayRecordStart(&recorder, path, &header)) {
    TimeSetFixed(0);
    return 0;
  }
  return 1;
}

/*
 * record this frame, or read the next frame of the replay; call once per
 * frame, after input is polled
 */
void ReplayUpdate() {
  replay_frame frame;
  uint32_t held[PAD_PLAYER_COUNT];
  int i;

  if (replay_file) {
    if (fread(&frame, sizeof(frame), 1, replay_file) != 1) {
      fprintf(stderr, "replay finished, back to the keyboard\n");
      ReplayStop();
      return;
    }
    if (frame.ticks != GetTicksElapsed() && !replay_desynced) {
      fprintf(stderr, "replay out of step at tick %d (recorded at %d)\n",
        GetTicksElapsed(), frame.ticks);
      replay_desynced = 1;
    }
    memcpy(replay_held, frame.held, sizeof(replay_held));
    return;
  }
  for (i=0;i<PAD_PLAYER_COUNT;i++)
    held[i] = SwPadRead(i);
  ReplayRecordFrame(&recorder, GetTicksElapsed(), held);
  if (recorder.file)
    fflush(recorder.file); /* keep what's recorded if the game crashes */
}

/* 0 when not replaying, or for a pad no recording has */
int ReplayHeld(int idx, uint32_t *held) {
  if (!replay_file || idx < 0 || idx >= PAD_PLAYER_COUNT) { return 0; }
  *held = replay_held[idx];
  return 1;
}

/* is a recording being replayed (as opposed to recorded, or finished)? */
int ReplayIsPlaying() {
  return replay_file != 0;
}

void ReplayStop() {
  ReplayRecordStop(&recorder);
  if (replay_file) {
    fclose(replay_file);
    replay_file = 0;
  }
  TimeSetSpeed(1);
  TimeSetFixed(0);
}
