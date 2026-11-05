#ifndef _PC_BOOT_H_
#define _PC_BOOT_H_

#include <string.h>
#include "common.h"

/*
 * boot_level = intro starts the game in the lab intro (pc), the scene the
 * title plays when left idle, instead of waiting on the title for it
 */
#define BOOT_INTRO_NAME "intro"
#define BOOT_INTRO_LID  LID_INTRO

static inline int BootLevelIsIntro(const char *boot_level) {
  return strcmp(boot_level, BOOT_INTRO_NAME) == 0;
}

#endif /* _PC_BOOT_H_ */
