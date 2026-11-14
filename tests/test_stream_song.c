#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sndfile.h>
#include "utest.h"
#include "pc/sound/stream.h"

#define SONG_DIR "build/test_stream_song"

/* a sawtooth wave's sample i: up from -8000 to 8000 every 64 */
static int Saw(int i) {
  return (i % 64) * 250 - 8000;
}

/* a sawtooth song at path: frames frames at rate, in channels, of the format given */
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
      samples[i*channels + c] = (short)(Saw(i) * (c + 1));
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

/* the mean square of a song's samples: its loudness, squared */
static double MeanSquare(const int16_t *samples, size_t count) {
  double sum;
  size_t i;

  sum = 0;
  for (i = 0; i < count; i++) { sum += (double)samples[i] * samples[i]; }
  return sum / count;
}

UTEST(stream_song, a_stereo_song_at_the_games_rate_keeps_its_frames_and_balance) {
  stream_song song;

  ASSERT_TRUE(write_song(SONG_DIR "/stereo.wav", SF_FORMAT_WAV | SF_FORMAT_PCM_16, STREAM_SONG_RATE, 2, 500));
  ASSERT_TRUE(StreamSongLoad(SONG_DIR "/stereo.wav", &song));
  ASSERT_EQ(500, (int)song.frames);
  ASSERT_NEAR(2.0, (double)song.samples[2*10 + 1] / song.samples[2*10], 0.01); /* the right twice the left */
  StreamSongFree(&song);
}

UTEST(stream_song, a_song_plays_as_loud_as_the_games_music) {
  stream_song song;

  ASSERT_TRUE(write_song(SONG_DIR "/loud.wav", SF_FORMAT_WAV | SF_FORMAT_PCM_16, STREAM_SONG_RATE, 2, 4096));
  ASSERT_TRUE(StreamSongLoad(SONG_DIR "/loud.wav", &song));
  ASSERT_NEAR(1.0, MeanSquare(song.samples, song.frames * 2) / ((double)STREAM_SONG_LOUDNESS * STREAM_SONG_LOUDNESS), 0.04);
  StreamSongFree(&song);
}

/* count samples of a square wave, between -height and height */
static float *Square(float height, size_t count) {
  float *samples;
  size_t i;

  samples = (float*)malloc(count * sizeof(float));
  for (i = 0; i < count; i++) {
    samples[i] = height;
    if (i % 2) { samples[i] = -height; }
  }
  return samples;
}

UTEST(stream_song, a_loud_song_is_turned_down_to_the_games_music) {
  float *samples = Square(0.5f, 100);

  ASSERT_NEAR(STREAM_SONG_LOUDNESS / (0.5 * 32768), StreamSongLoudnessScale(samples, 100), 0.0001);
  free(samples);
}

UTEST(stream_song, a_quiet_song_is_turned_up_to_the_games_music) {
  float *samples = Square(0.01f, 100);

  ASSERT_NEAR(STREAM_SONG_LOUDNESS / (0.01 * 32768), StreamSongLoudnessScale(samples, 100), 0.001);
  free(samples);
}

UTEST(stream_song, a_song_is_never_turned_up_past_full_scale) {
  float *samples = Square(0.0001f, 10000);

  samples[0] = 0.5f; /* a peak, among a long near silence that would be turned up 6 times */
  ASSERT_NEAR(2.0, StreamSongLoudnessScale(samples, 10000), 0.0001);
  free(samples);
}

UTEST(stream_song, a_silent_song_stays_as_it_is) {
  float *samples = Square(0.0f, 100);

  ASSERT_EQ(1.0f, StreamSongLoudnessScale(samples, 100));
  free(samples);
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

/* a song of three frames, (1, -1), (2, -2), (3, -3), not playing */
static int16_t three_frames[] = { 1, -1, 2, -2, 3, -3 };
static stream_song ThreeFrameSong() {
  stream_song song = { 0 };

  song.samples = three_frames;
  song.frames = 3;
  return song;
}

UTEST(stream_song, a_playing_song_goes_back_round_to_its_start_at_its_end) {
  stream_song song = ThreeFrameSong();
  int16_t out[10];

  StreamSongPlay(&song);
  StreamSongRead(&song, out, 5);
  ASSERT_EQ(3, out[4]);   /* its last frame */
  ASSERT_EQ(1, out[6]);   /* then its first again */
  ASSERT_EQ(-2, out[9]);
}

UTEST(stream_song, a_song_not_playing_is_silent_and_stays_where_it_is) {
  stream_song song = ThreeFrameSong();
  int16_t out[4] = { 9, 9, 9, 9 };

  StreamSongRead(&song, out, 2);
  ASSERT_EQ(0, out[0]);
  ASSERT_EQ(0, out[3]);
  ASSERT_EQ(0, (int)song.at);
}

UTEST(stream_song, playing_starts_it_from_its_start_and_stopping_goes_back_there) {
  stream_song song = ThreeFrameSong();
  int16_t out[4];

  StreamSongPlay(&song);
  StreamSongRead(&song, out, 2);
  StreamSongStop(&song);
  ASSERT_EQ(0, (int)song.at);
  StreamSongRead(&song, out, 1);
  ASSERT_EQ(0, out[0]);
  song.at = 2;
  StreamSongPlay(&song);
  StreamSongRead(&song, out, 1);
  ASSERT_EQ(1, out[0]);
}
