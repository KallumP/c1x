#include <math.h>
#include <stdio.h>
#include <sys/stat.h>
#include <sndfile.h>
#include "utest.h"
#include "pc/sound/stream.h"

#define SONG_DIR "build/test_stream_song"

/* a sine wave song at path: frames frames at rate, in channels, of the format given */
static int write_song(const char *path, int format, int rate, int channels, int frames) {
  SF_INFO info = { 0 };
  SNDFILE *file;
  short *samples;
  int i, c;

  mkdir("build");
  mkdir(SONG_DIR);
  info.samplerate = rate;
  info.channels = channels;
  info.format = format;
  file = sf_open(path, SFM_WRITE, &info);
  if (!file) { return 0; }
  samples = (short*)malloc(frames * channels * sizeof(short));
  for (i = 0; i < frames; i++) {
    for (c = 0; c < channels; c++)
      samples[i*channels + c] = (short)(8000 * sin(i * 0.05) * (c + 1));
  }
  sf_writef_short(file, samples, frames);
  sf_close(file);
  free(samples);
  return 1;
}

UTEST(stream_song, a_mono_song_at_half_the_rate_plays_at_the_games_rate_on_both_sides) {
  stream_song song;

  ASSERT_TRUE(write_song(SONG_DIR "/mono.wav", SF_FORMAT_WAV | SF_FORMAT_PCM_16, 22050, 1, 1000));
  ASSERT_TRUE(StreamSongLoad(SONG_DIR "/mono.wav", &song));
  ASSERT_EQ(2000, (int)song.frames);
  ASSERT_EQ(song.samples[2*100], song.samples[2*100 + 1]); /* left as right */
  StreamSongFree(&song);
}

UTEST(stream_song, a_stereo_song_at_the_games_rate_is_its_own_samples) {
  stream_song song;

  ASSERT_TRUE(write_song(SONG_DIR "/stereo.wav", SF_FORMAT_WAV | SF_FORMAT_PCM_16, STREAM_SONG_RATE, 2, 500));
  ASSERT_TRUE(StreamSongLoad(SONG_DIR "/stereo.wav", &song));
  ASSERT_EQ(500, (int)song.frames);
  ASSERT_EQ((int16_t)(8000 * sin(10 * 0.05)), song.samples[2*10]);
  ASSERT_EQ((int16_t)(16000 * sin(10 * 0.05)), song.samples[2*10 + 1]);
  StreamSongFree(&song);
}

UTEST(stream_song, an_mp3_plays) {
  stream_song song;

  ASSERT_TRUE(write_song(SONG_DIR "/song.mp3", SF_FORMAT_MPEG | SF_FORMAT_MPEG_LAYER_III, STREAM_SONG_RATE, 2, STREAM_SONG_RATE));
  ASSERT_TRUE(StreamSongLoad(SONG_DIR "/song.mp3", &song));
  ASSERT_TRUE(song.frames > STREAM_SONG_RATE * 9 / 10); /* about a second (mp3 pads its start and end) */
  ASSERT_TRUE(song.frames < STREAM_SONG_RATE * 11 / 10);
  StreamSongFree(&song);
}

UTEST(stream_song, a_file_that_isnt_there_doesnt_load) {
  stream_song song;

  ASSERT_FALSE(StreamSongLoad(SONG_DIR "/missing.mp3", &song));
  ASSERT_TRUE(song.samples == 0);
}
