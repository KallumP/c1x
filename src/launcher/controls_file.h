#ifndef _LAUNCHER_CONTROLS_FILE_H_
#define _LAUNCHER_CONTROLS_FILE_H_

#include "pc/controls.h"

#define BUTTON_KEYS_MAX 4

/* each button's keys, in pad_button_names' order */
typedef struct {
  int key_count[PAD_BUTTON_COUNT];
  SDL_Scancode keys[PAD_BUTTON_COUNT][BUTTON_KEYS_MAX];
} launcher_controls;

extern int FindPadButton(const char *name);
extern void ResetControls(launcher_controls *c);
extern int ReadControlsFile(const char *path, launcher_controls *c);
extern int AreControlsEqual(const launcher_controls *a, const launcher_controls *b);

#endif /* _LAUNCHER_CONTROLS_FILE_H_ */
