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

size_t FieldLength(const char *text) {
  size_t length;

  length = 0;
  while (!IsLineEnd(text[length]) && text[length] != '\t') { length++; }
  return length;
}
