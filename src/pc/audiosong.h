#ifndef _PC_AUDIOSONG_H_
#define _PC_AUDIOSONG_H_

/*
 * a custom level's own song as an audio file (pc): <level>.mp3, .ogg, .flac
 * or .wav next to its .nsd and .nsf. the level builder puts it there when the
 * level's level.cfg picks an audio file in its folder as its music. it plays,
 * looping, in place of the level's music (sound/stream.c)
 */
#define AUDIO_SONG_PATH_MAX 1024

typedef struct {
  char path[AUDIO_SONG_PATH_MAX];
  int has_song;
} audio_song;

extern audio_song custom_level_audio_song; /* the boot level's (InitBootLevel) */

extern void AudioSongFind(const char *level, audio_song *song);
extern const audio_song *AudioSongToPlay(int in_custom_level);

#endif /* _PC_AUDIOSONG_H_ */
