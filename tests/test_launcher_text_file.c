#include <SDL2/SDL.h>
#include "utest.h"
#include "launcher/text_file.h"
#include "test_files.h"

#define TEST_TEXT_FILE "build/test_launcher_text_file.txt"

UTEST(launcher_text_file, a_file_thats_there_is_read_whole) {
  char *text;

  WriteWholeFile(TEST_TEXT_FILE, "title = Tide Ruins\n");
  text = ReadWholeFileOrEmpty(TEST_TEXT_FILE);
  ASSERT_STREQ("title = Tide Ruins\n", text);
  SDL_free(text);
}

UTEST(launcher_text_file, a_file_that_isnt_there_is_read_as_empty) {
  char *text;

  text = ReadWholeFileOrEmpty("build/test_launcher_no_such_file.txt");
  ASSERT_STREQ("", text);
  SDL_free(text);
}
