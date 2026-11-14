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
/* how loud a song is brought to as it loads: the root mean square of its samples, of 32768.
   the music voice turns it up by 4/3 (gain 8 in the mix, over 2 in SwMidiProcess and 3 in
   SwMixToSample), to about 1300, as loud as n. sanity beach's music comes out; an mp3 at its
   own level came out 3 to 8 times louder than the game's music, and clipped */
#define STREAM_SONG_LOUDNESS 1000

typedef struct {
  int16_t *samples; /* left, right, left, right... */
  size_t frames;
  size_t at;        /* the next frame to play */
  int playing;
} stream_song;

extern int StreamSongLoad(const char *path, float volume, stream_song *song);
extern void StreamSongFree(stream_song *song);
extern void StreamSongPlay(stream_song *song);
extern void StreamSongStop(stream_song *song);
extern void StreamSongRead(stream_song *song, int16_t *out, int frames);
extern float StreamSongLoudnessScale(const float *samples, size_t count, float volume);

#endif /* _PC_SOUND_STREAM_H_ */
