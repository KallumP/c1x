#ifndef _LAUNCHER_UI_H_
#define _LAUNCHER_UI_H_

#include "command.h"

/* text saying why something can't be done */
#define PROBLEM_COLOUR ((ImVec4){1.0f, 0.45f, 0.4f, 1.0f})

extern void DrawCommandOutput(const char *id, const background_command *c);

#endif /* _LAUNCHER_UI_H_ */
