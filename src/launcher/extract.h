#ifndef _LAUNCHER_EXTRACT_H_
#define _LAUNCHER_EXTRACT_H_

#include <stddef.h>

/* copies the game's files from the disc image into out_folder; how many, or
   -1 with message saying why not (message says what was done either way) */
extern int ExtractStreams(const char *image, const char *out_folder, char *message,
  size_t size);

#endif /* _LAUNCHER_EXTRACT_H_ */
