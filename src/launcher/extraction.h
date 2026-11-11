#ifndef _LAUNCHER_EXTRACTION_H_
#define _LAUNCHER_EXTRACTION_H_

/*
 * extracting the game's files on a thread, so the launcher keeps drawing
 */
#include <SDL2/SDL.h>
#include "paths.h"

typedef struct {
  SDL_Thread *thread; /* while it runs */
  SDL_atomic_t finished;
  char image[PATH_MAX_LEN];
  char out_folder[PATH_MAX_LEN];
  int file_count;     /* once finished: files extracted, or -1 */
  char message[PATH_MAX_LEN + 128]; /* once finished: what was done, or why not */
} extraction;

extern int StartExtraction(extraction *job, const char *image, const char *out_folder);
extern int IsExtractionRunning(const extraction *job);

/* returns 1 on the call the extraction is found finished */
extern int UpdateExtraction(extraction *job);

#endif /* _LAUNCHER_EXTRACTION_H_ */
