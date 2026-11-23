#ifndef _LAUNCHER_LEVEL_TITLE_H_
#define _LAUNCHER_LEVEL_TITLE_H_

/*
 * the name the launcher shows a custom level by: the title on its loading
 * screen, by the level editor's rules (tools/level_editor/src/levelTitle.ts)
 */
#include <stddef.h>

#define LEVEL_TITLE_MAX 64 /* a title with its terminating 0; one longer is cut short */

/* the title of the level in folder, whose level.cfg's text is cfg ("" for none):
   its title if it gives one the loading screen can draw, else the folder's name in
   words without the number in front that orders the levels ("1_tide_ruins" is
   "Tide Ruins"), else, if none of that can be drawn, the folder's name */
extern void LevelTitle(const char *folder, const char *cfg, char *title, size_t size);

#endif /* _LAUNCHER_LEVEL_TITLE_H_ */
