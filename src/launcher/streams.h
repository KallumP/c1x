#ifndef _LAUNCHER_STREAMS_H_
#define _LAUNCHER_STREAMS_H_

#include <stddef.h>

#define STREAM_FILE_COUNT 88 /* an .nsd and an .nsf for each of the game's 44 levels */
#define STREAM_FILE_NAME_MAX 16

/* the game's files missing from streams/ */
typedef struct {
  int count;
  char names[STREAM_FILE_COUNT][STREAM_FILE_NAME_MAX];
} stream_files;

extern void StreamFileName(int level_id, const char *extension, char *name, size_t size);
extern void ListMissingStreamFiles(const char *repo, stream_files *missing);

#endif /* _LAUNCHER_STREAMS_H_ */
