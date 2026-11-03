#ifndef _LAUNCHER_SETTINGS_FILE_H_
#define _LAUNCHER_SETTINGS_FILE_H_

#include "pc/settings.h"

extern int ReadSettingsFile(const char *path, pc_settings *s);
extern char *SetSettingLine(const char *text, const char *name, const char *value);
extern char *CommentOutSettingLine(const char *text, const char *name);
extern int SaveSettingsFile(const char *path, const char *example_path, const pc_settings *s);

#endif /* _LAUNCHER_SETTINGS_FILE_H_ */
