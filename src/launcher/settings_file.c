/*
 * settings.cfg for the launcher: read with the game's own settings parser,
 * and saved by changing (or adding) each setting's line, keeping the rest
 * of the file as it is
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "settings_file.h"
#include "text_file.h"

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

static void AppendSettingLine(text_builder *b, const char *name, const char *value) {
  AppendString(b, name);
  AppendString(b, " = ");
  AppendString(b, value);
}

/*
 * text (a settings file's) with each line for setting name changed to set it
 * to value (every one, as the game reads the last), or a line added at the
 * end if there isn't one. the other lines, commented out ones included, and
 * the line endings stay as they are. returns the new text, to SDL_free.
 */
char *SetSettingLine(const char *text, const char *name, const char *value) {
  text_builder b = { 0 };
  const char *line, *next, *line_end, *eol, *line_value;
  char buf[128];
  int found;

  eol = LineEndingOf(text);
  AppendString(&b, "");
  found = 0;
  for (line=text;*line;line=next) {
    line_end = EndOfLine(line, &next);
    line_value = ConfigLineValue(line, line_end - line, name, buf, sizeof(buf));
    if (line_value && SDL_strcasecmp(line_value, value) != 0) {
      AppendSettingLine(&b, name, value);
      AppendText(&b, line_end, next - line_end);
    }
    else {
      AppendText(&b, line, next - line);
    }
    found = found || line_value;
  }
  if (!found) {
    if (b.len > 0 && b.data[b.len-1] != '\n') { AppendString(&b, eol); }
    AppendSettingLine(&b, name, value);
    AppendString(&b, eol);
  }
  return b.data;
}

/*
 * text (a settings file's) with its lines setting name commented out with
 * "# ", so the setting takes its default. returns the new text, to SDL_free.
 */
char *CommentOutSettingLine(const char *text, const char *name) {
  text_builder b = { 0 };
  const char *line, *next;
  char buf[128];

  AppendString(&b, "");
  for (line=text;*line;line=next) {
    if (ConfigLineValue(line, EndOfLine(line, &next) - line, name, buf, sizeof(buf))) {
      AppendString(&b, "# ");
    }
    AppendText(&b, line, next - line);
  }
  return b.data;
}

/* text with name commented out, freeing text */
static char *CommentOutLine(char *text, const char *name) {
  char *changed;

  changed = CommentOutSettingLine(text, name);
  SDL_free(text);
  return changed;
}

/* text with name set to value, freeing text */
static char *ReplaceSettingLine(char *text, const char *name, const char *value) {
  char *changed;

  changed = SetSettingLine(text, name, value);
  SDL_free(text);
  return changed;
}

static char *ReplaceOnOffLine(char *text, const char *name, int on) {
  return ReplaceSettingLine(text, name, on ? "on" : "off");
}

static char *ReplaceNumberLine(char *text, const char *name, uint32_t number) {
  char value[16];

  SDL_snprintf(value, sizeof(value), "%u", number);
  return ReplaceSettingLine(text, name, value);
}

static char *ReplaceColorLine(char *text, const char *name, uint32_t color) {
  char value[SETTINGS_COLOR_DIGITS + 1];

  SDL_snprintf(value, sizeof(value), "%06x", color);
  return ReplaceSettingLine(text, name, value);
}

/* text with player's (1 or 2) colour lines set to outfit's */
static char *ReplaceOutfitLines(char *text, int player, const crash_outfit *outfit) {
  char name[32];

  SDL_snprintf(name, sizeof(name), "p%d_fur_color", player);
  text = ReplaceColorLine(text, name, outfit->fur);
  SDL_snprintf(name, sizeof(name), "p%d_belly_color", player);
  text = ReplaceColorLine(text, name, outfit->belly);
  SDL_snprintf(name, sizeof(name), "p%d_hair_color", player);
  text = ReplaceColorLine(text, name, outfit->hair);
  SDL_snprintf(name, sizeof(name), "p%d_shorts_color", player);
  text = ReplaceColorLine(text, name, outfit->shorts);
  SDL_snprintf(name, sizeof(name), "p%d_shoes_color", player);
  return ReplaceColorLine(text, name, outfit->shoes);
}

/* text (a settings file's, to SDL_free) with every setting in s set */
static char *SettingsTextWith(char *text, const pc_settings *s) {
  int i;

  text = ReplaceOnOffLine(text, "skip_loading_screen", s->skip_loading_screen);
  text = ReplaceNumberLine(text, "loading_screen_min_ms", s->loading_screen_min_ms);
  text = ReplaceOnOffLine(text, "speed_display", s->speed_display);
  text = ReplaceOnOffLine(text, "fps_display", s->fps_display);
  text = ReplaceOnOffLine(text, "spin_display", s->spin_display);
  text = ReplaceOnOffLine(text, "box_display", s->box_display);
  text = ReplaceOnOffLine(text, "skip_splash_screens", s->skip_splash_screens);
  text = ReplaceOnOffLine(text, "fix_model_draw_order", s->fix_model_draw_order);
  text = ReplaceOnOffLine(text, "spin_ledge_jump", s->spin_ledge_jump);
  text = ReplaceOnOffLine(text, "two_players", s->two_players);
  text = ReplaceOnOffLine(text, "replay_inputs", s->replay_inputs);
  text = ReplaceNumberLine(text, "replay_speed", s->replay_speed);
  text = ReplaceNumberLine(text, "frame_rate", s->frame_rate);
  text = ReplaceOnOffLine(text, "fullscreen", s->fullscreen);
  text = ReplaceOnOffLine(text, "memory_card", s->memory_card);
  text = ReplaceOnOffLine(text, "mute", s->mute);
  for (i=0;i<SETTINGS_PLAYER_COUNT;i++)
    text = ReplaceOutfitLines(text, i + 1, &s->outfits[i]);
  if (s->boot_level[0]) {
    text = ReplaceSettingLine(text, "boot_level", s->boot_level);
  }
  else {
    text = CommentOutLine(text, "boot_level"); /* no custom level */
  }
  return text;
}

/*
 * save s to the settings file at path, keeping its other lines. without
 * one, it starts from the example settings file at example_path (if there
 * is one), keeping its comments. returns 0 if it can't be written.
 */
int SaveSettingsFile(const char *path, const char *example_path, const pc_settings *s) {
  char *text;
  int saved;

  text = ReadWholeFile(path);
  if (!text) { text = ReadWholeFile(example_path); }
  if (!text) { text = SDL_strdup(""); }
  text = SettingsTextWith(text, s);
  saved = WriteWholeFile(path, text);
  SDL_free(text);
  return saved;
}

static int AreOutfitsEqual(const crash_outfit *a, const crash_outfit *b) {
  return a->fur == b->fur && a->shorts == b->shorts && a->shoes == b->shoes
    && a->belly == b->belly && a->hair == b->hair;
}

/* whether a and b set the same settings (boot_level by its text, not what's after it) */
int AreSettingsEqual(const pc_settings *a, const pc_settings *b) {
  return a->skip_loading_screen == b->skip_loading_screen
    && a->loading_screen_min_ms == b->loading_screen_min_ms
    && a->speed_display == b->speed_display
    && a->fps_display == b->fps_display
    && a->spin_display == b->spin_display
    && a->box_display == b->box_display
    && a->skip_splash_screens == b->skip_splash_screens
    && a->fix_model_draw_order == b->fix_model_draw_order
    && a->spin_ledge_jump == b->spin_ledge_jump
    && a->two_players == b->two_players
    && a->replay_inputs == b->replay_inputs
    && a->replay_speed == b->replay_speed
    && a->frame_rate == b->frame_rate
    && a->fullscreen == b->fullscreen
    && a->memory_card == b->memory_card
    && a->mute == b->mute
    && AreOutfitsEqual(&a->outfits[0], &b->outfits[0])
    && AreOutfitsEqual(&a->outfits[1], &b->outfits[1])
    && SDL_strcmp(a->boot_level, b->boot_level) == 0;
}
