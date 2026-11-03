#ifndef _LAUNCHER_EXTRACT_H_
#define _LAUNCHER_EXTRACT_H_

#include <stddef.h>

extern int ExtractStreamsCommand(const char *repo, const char *image, char *command,
  size_t size);

#endif /* _LAUNCHER_EXTRACT_H_ */
