#ifndef _PC_FULLSCREEN_H_
#define _PC_FULLSCREEN_H_

#include <SDL2/SDL.h>

/* whether the key, pressed with the modifiers mod held, switches fullscreen on or off */
extern int IsFullscreenToggle(SDL_Scancode key, Uint16 mod);

#endif /* _PC_FULLSCREEN_H_ */
