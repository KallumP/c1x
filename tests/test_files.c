#include <stdio.h>
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "test_files.h"

void MakeFolder(const char *path) {
#ifdef _WIN32
  mkdir(path);
#else
  mkdir(path, 0777);
#endif
}
