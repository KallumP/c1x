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
  ASSERT_TRUE(strstr(output, "tests") != 0);
  ProcessFree(p);
}

UTEST(launcher_process, keeps_the_end_of_long_output) {
  char output[8];
  process *p;

  p = ProcessRun(".", "echo abcdefghijklmnopqrstuvwxyz");
  ASSERT_TRUE(p != 0);
  ASSERT_TRUE(WaitForProcess(p));
  ProcessCopyOutput(p, output, sizeof(output));
  ASSERT_EQ(7u, strlen(output));
  ASSERT_TRUE(strstr("uvwxyz\r\n", output) != 0 || strstr("tuvwxyz\n", output) != 0);
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
