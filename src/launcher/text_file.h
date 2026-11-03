#ifndef _LAUNCHER_TEXT_FILE_H_
#define _LAUNCHER_TEXT_FILE_H_

#include <stddef.h>

/* text built up a piece at a time; data is SDL_free'd by whoever keeps it */
typedef struct {
  char *data;
  size_t len, size;
} text_builder;

extern void AppendText(text_builder *b, const char *text, size_t len);
extern void AppendString(text_builder *b, const char *text);
extern const char *EndOfLine(const char *line, const char **next);
extern const char *LineEndingOf(const char *text);
extern const char *ConfigLineValue(const char *line, size_t len, const char *name,
  char *buf, size_t size);
extern char *ReadWholeFile(const char *path);
extern int WriteWholeFile(const char *path, const char *text);

#endif /* _LAUNCHER_TEXT_FILE_H_ */
