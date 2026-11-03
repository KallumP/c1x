#ifndef _LAUNCHER_UI_H_
#define _LAUNCHER_UI_H_

#include "command.h"

/* text saying why something can't be done */
#define PROBLEM_COLOUR ((ImVec4){1.0f, 0.45f, 0.4f, 1.0f})
#define BUTTON_WIDTH 120.0f

extern void LoadLauncherFonts(void);
extern void SetLauncherStyle(void);
extern void DrawHeading(const char *text);
extern int DrawBigButton(const char *label);
extern void DrawTooltip(const char *text);
extern int BeginFieldRows(const char *id);
extern void BeginFieldRow(const char *label, const char *tooltip);
extern void EndFieldRows(void);
extern void DrawCommandOutput(const char *id, const background_command *c);

#endif /* _LAUNCHER_UI_H_ */
