#include "utest.h"
#include <SDL2/SDL.h>
#include "launcher/process.h"

#ifdef _WIN32
#define PRINT_FOLDER "cd"
#define WAIT_30_SECONDS "ping -n 30 127.0.0.1"
#else
#define PRINT_FOLDER "pwd"
#define WAIT_30_SECONDS "sleep 30"
#endif

/* text with its trailing line ending (\n or \r\n) removed */
static void TrimLineEnding(char *text) {
  size_t length;

  length = strlen(text);
  while (length > 0 && (text[length-1] == '\n' || text[length-1] == '\r')) {
    text[--length] = 0;
  }
}

/* whether text ends with end */
static int EndsWith(const char *text, const char *end) {
  size_t text_length, end_length;

  text_length = strlen(text);
  end_length = strlen(end);
  if (end_length > text_length) { return 0; }
  return strcmp(text + text_length - end_length, end) == 0;
}

/* whether path's last folder is name */
static int EndsWithFolder(const char *path, const char *name) {
  char with_slash[64], with_backslash[64];

  snprintf(with_slash, sizeof(with_slash), "/%s", name);
  snprintf(with_backslash, sizeof(with_backslash), "\\%s", name);
  return EndsWith(path, with_slash) || EndsWith(path, with_backslash);
}

/* wait up to 10 seconds for p to finish; returns 0 if it didn't */
static int WaitForProcess(process *p) {
  int waited;

  for (waited=0;waited<10000;waited+=10) {
    if (!ProcessIsRunning(p)) { return 1; }
    SDL_Delay(10);
  }
  return 0;
}

UTEST(launcher_process, collects_a_commands_output) {
  char output[256];
  process *p;

  p = ProcessRun(".", "echo hello");
  ASSERT_TRUE(p != 0);
  ASSERT_TRUE(WaitForProcess(p));
  ProcessCopyOutput(p, output, sizeof(output));
  ASSERT_TRUE(strstr(output, "hello") != 0);
  ASSERT_EQ(0, ProcessExitCode(p));
  ProcessFree(p);
}

UTEST(launcher_process, reports_the_exit_code) {
  process *p;

  p = ProcessRun(".", "exit 3");
  ASSERT_TRUE(p != 0);
  ASSERT_TRUE(WaitForProcess(p));
  ASSERT_EQ(3, ProcessExitCode(p));
  ProcessFree(p);
}

UTEST(launcher_process, runs_in_the_folder_given) {
  char output[1024];
  process *p;

  p = ProcessRun("tests", PRINT_FOLDER);
  ASSERT_TRUE(p != 0);
  ASSERT_TRUE(WaitForProcess(p));
  ProcessCopyOutput(p, output, sizeof(output));
  TrimLineEnding(output);
  ASSERT_TRUE(EndsWithFolder(output, "tests"));
  ProcessFree(p);
}

#define ALPHABET "abcdefghijklmnopqrstuvwxyz"

UTEST(launcher_process, keeps_the_end_of_long_output) {
  char output[8];
  process *p;

  p = ProcessRun(".", "echo " ALPHABET);
  ASSERT_TRUE(p != 0);
  ASSERT_TRUE(WaitForProcess(p));
  ProcessCopyOutput(p, output, sizeof(output));
  ASSERT_EQ(sizeof(output)-1, strlen(output));
  TrimLineEnding(output);
  ASSERT_TRUE(EndsWith(ALPHABET, output));
  ProcessFree(p);
}

UTEST(launcher_process, can_be_stopped) {
  process *p;

  p = ProcessRun(".", WAIT_30_SECONDS);
  ASSERT_TRUE(p != 0);
  SDL_Delay(100);
  ASSERT_TRUE(ProcessIsRunning(p));
  ProcessStop(p);
  ASSERT_TRUE(WaitForProcess(p));
  ProcessFree(p);
}

UTEST(launcher_process, fails_for_a_missing_folder) {
  ASSERT_TRUE(ProcessRun("no_such_folder", "echo hello") == 0);
}
