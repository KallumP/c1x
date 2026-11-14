/*
 * a song from an audio file, decoded with libsndfile
 */
#include <stdio.h>
#include <stdlib.h>
#include <sndfile.h>

#include "stream.h"

/* the whole file's samples as floats, interleaved as it has them; 0 if it can't be read */
static float *ReadWholeFile(const char *path, SF_INFO *info) {
  SNDFILE *file;
  float *samples;
  sf_count_t read;

  info->format = 0;
  file = sf_open(path, SFM_READ, info);
  if (!file) {
    fprintf(stderr, "could not read %s: %s\n", path, sf_strerror(0));
    return 0;
  }
  samples = (float*)malloc((size_t)info->frames * info->channels * sizeof(float));
  read = 0;
  if (samples) { read = sf_readf_float(file, samples, info->frames); }
  sf_close(file);
  info->frames = read;
  return samples;
}

/* a sample libsndfile read as a float (a 16 bit sample over 32768) back as 16 bits */
static int16_t ToSample(float value) {
  float scaled;

  scaled = value * 32768.0f;
  if (scaled > 32767.0f) { scaled = 32767.0f; }
  if (scaled < -32768.0f) { scaled = -32768.0f; }
  if (scaled < 0) { return (int16_t)(scaled - 0.5f); } /* to the nearest */
  return (int16_t)(scaled + 0.5f);
}

/* a channel of the file at a time in its own frames (between two, blended) */
static float SampleAt(const float *samples, const SF_INFO *info, double at, int channel) {
  size_t frame, next;
  double blend;

  frame = (size_t)at;
  next = frame + 1;
  if (next >= (size_t)info->frames) { next = frame; } /* the last frame */
  blend = at - (double)frame;
  if (channel >= info->channels) { channel = 0; } /* a mono song plays the same on both sides */
  return (float)(samples[frame*info->channels + channel] * (1.0 - blend)
               + samples[next*info->channels + channel] * blend);
}

/* the file's samples as stereo at the game's rate, turned up or down by scale */
static void Resample(const float *samples, const SF_INFO *info, float scale, stream_song *song) {
  double step;
  size_t i;

  step = (double)info->samplerate / STREAM_SONG_RATE;
  song->frames = (size_t)((double)info->frames / step);
  song->samples = (int16_t*)malloc(song->frames * 2 * sizeof(int16_t));
  for (i = 0; song->samples && i < song->frames; i++) {
    song->samples[2*i] = ToSample(SampleAt(samples, info, i * step, 0) * scale);
    song->samples[2*i + 1] = ToSample(SampleAt(samples, info, i * step, 1) * scale);
  }
}

/* gcc's own square root: <math.h> is the game's src/math.h here, on the include path */
static double SquareRoot(double value) {
  return __builtin_sqrt(value);
}

/* the mean square of samples (floats, full scale at 1) */
static double MeanSquare(const float *samples, size_t count) {
  double sum;
  size_t i;

  sum = 0;
  for (i = 0; i < count; i++) { sum += (double)samples[i] * samples[i]; }
  return sum / count;
}

/* the loudest of samples, either way */
static float Peak(const float *samples, size_t count) {
  float peak;
  size_t i;

  peak = 0;
  for (i = 0; i < count; i++) {
    if (samples[i] > peak) { peak = samples[i]; }
    if (-samples[i] > peak) { peak = -samples[i]; }
  }
  return peak;
}

/* what to turn samples (floats, full scale at 1) up or down by, so they're volume times
   STREAM_SONG_LOUDNESS loud (volume 1 for as loud as the game's music), but no further up
   than their peak at full scale; silence as it is */
float StreamSongLoudnessScale(const float *samples, size_t count, float volume) {
  double mean_square, target, scale;
  float peak;

  mean_square = MeanSquare(samples, count);
  peak = Peak(samples, count);
  if (mean_square <= 0 || peak <= 0) { return 1.0f; }
  target = STREAM_SONG_LOUDNESS / 32768.0;
  scale = volume * target / SquareRoot(mean_square);
  if (scale * peak > 1.0) { scale = 1.0 / peak; }
  return (float)scale;
}

/* the audio file at path as a song, volume times as loud as the game's music; whether it could be read */
int StreamSongLoad(const char *path, float volume, stream_song *song) {
  SF_INFO info = { 0 };
  float *samples;

  song->samples = 0;
  song->frames = 0;
  song->at = 0;
  song->playing = 0;
  samples = ReadWholeFile(path, &info);
  if (!samples || info.frames <= 0 || info.channels <= 0) {
    free(samples);
    return 0;
  }
  Resample(samples, &info, StreamSongLoudnessScale(samples, (size_t)info.frames * info.channels, volume), song);
  free(samples);
  return song->samples != 0;
}

void StreamSongFree(stream_song *song) {
  free(song->samples);
  song->samples = 0;
  song->frames = 0;
  song->at = 0;
  song->playing = 0;
}

/* plays the song from its start */
void StreamSongPlay(stream_song *song) {
  song->at = 0;
  song->playing = 1;
}

/* stops the song, back at its start */
void StreamSongStop(stream_song *song) {
  song->playing = 0;
  song->at = 0;
}

/* the song's next frames, back round to its start at its end; silence when it isn't playing */
void StreamSongRead(stream_song *song, int16_t *out, int frames) {
  int i;

  for (i = 0; i < frames; i++) {
    if (!song->playing || !song->frames) {
      out[2*i] = 0;
      out[2*i + 1] = 0;
      continue;
    }
    out[2*i] = song->samples[2*song->at];
    out[2*i + 1] = song->samples[2*song->at + 1];
    song->at = (song->at + 1) % song->frames;
  }
}
