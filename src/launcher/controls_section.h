#ifndef _LAUNCHER_CONTROLS_SECTION_H_
#define _LAUNCHER_CONTROLS_SECTION_H_

#include <SDL2/SDL_scancode.h>

extern void LoadControlsSection(const char *repo);
extern int SaveControlsSection(const char *repo);
extern int TakeControlsKeyPress(SDL_Scancode code);
extern void DrawControlsSection(const char *repo);

#endif /* _LAUNCHER_CONTROLS_SECTION_H_ */
