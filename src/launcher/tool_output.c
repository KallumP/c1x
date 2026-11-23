/*
 * reading what c1x's tools say: lines, numbers and tab-separated fields
 */
#include <SDL2/SDL.h>
#include "tool_output.h"

static int IsLineEnd(char c) {
  return c == 0 || c == '\r' || c == '\n';
}

size_t DigitCount(const char *text) {
  size_t count;

  count = 0;
  while (SDL_isdigit(text[count])) { count++; }
  return count;
}

size_t LineLength(const char *text) {
  size_t length;

  length = 0;
  while (!IsLineEnd(text[length])) { length++; }
  return length;
}

const char *CompleteLineAfter(const char *output, const char *prefix,
  size_t *length) {
  const char *rest;

  rest = SDL_strstr(output, prefix);
  if (!rest) { return 0; }
  rest += SDL_strlen(prefix);
  *length = LineLength(rest);
  if (!rest[*length]) { return 0; }
  return rest;
}

size_t FieldLength(const char *text) {
  size_t length;

  length = 0;
  while (!IsLineEnd(text[length]) && text[length] != '\t') { length++; }
  return length;
}

void CopyCutShort(char *to, size_t size, const char *text, size_t length) {
  SDL_strlcpy(to, text, SDL_min(length + 1, size));
}

int CopyWhole(char *to, size_t size, const char *text, size_t length) {
  to[0] = 0;
  if (length >= size) { return 0; }
  SDL_strlcpy(to, text, length + 1);
  return 1;
}
