/*
 * settings.cfg for the launcher: read with the game's own settings parser
 */
#include <stdio.h>
#include "settings_file.h"

/*
 * read the settings file at path into s, skipping invalid lines.
 * returns 0 (leaving s the defaults) if there isn't one.
 */
int ReadSettingsFile(const char *path, pc_settings *s) {
  FILE *file;
  char line[128];

  SettingsReset(s);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  while (fgets(line, sizeof(line), file)) {
    SettingsParseLine(line, s);
  }
  fclose(file);
  return 1;
}
