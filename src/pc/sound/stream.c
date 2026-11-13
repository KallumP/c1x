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

/* the file's samples as stereo at the game's rate */
static void Resample(const float *samples, const SF_INFO *info, stream_song *song) {
  double step;
  size_t i;

  step = (double)info->samplerate / STREAM_SONG_RATE;
  song->frames = (size_t)((double)info->frames / step);
  song->samples = (int16_t*)malloc(song->frames * 2 * sizeof(int16_t));
  for (i = 0; song->samples && i < song->frames; i++) {
    song->samples[2*i] = ToSample(SampleAt(samples, info, i * step, 0));
    song->samples[2*i + 1] = ToSample(SampleAt(samples, info, i * step, 1));
  }
}

/* the audio file at path as a song; whether it could be read */
int StreamSongLoad(const char *path, stream_song *song) {
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
  Resample(samples, &info, song);
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
