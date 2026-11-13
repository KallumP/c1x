#ifndef _PC_SOUND_STREAM_H_
#define _PC_SOUND_STREAM_H_

#include <stddef.h>
#include <stdint.h>

/*
 * a song from an audio file (pc): decoded whole by libsndfile (mp3, ogg,
 * flac, wav) into stereo 16 bit samples at the game's output rate, for
 * the music to play in place of a level's midi (sound/midi.c)
 */
#define STREAM_SONG_RATE 44100 /* the game's output rate (SwAudioInit) */

typedef struct {
  int16_t *samples; /* left, right, left, right... */
  size_t frames;
  size_t at;        /* the next frame to play */
} stream_song;

extern int StreamSongLoad(const char *path, stream_song *song);
extern void StreamSongFree(stream_song *song);
extern void StreamSongRead(stream_song *song, int16_t *out, int frames);

#endif /* _PC_SOUND_STREAM_H_ */
