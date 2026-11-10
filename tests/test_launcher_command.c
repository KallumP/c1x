#include "utest.h"
#include <SDL2/SDL.h>
#include "launcher/command.h"

#ifdef _WIN32
#define WAIT_30_SECONDS "ping -n 30 127.0.0.1"
#else
#define WAIT_30_SECONDS "sleep 30"
#endif

static background_command command; /* too big for the stack */

/* update command for up to 10 seconds; returns how many updates said it finished */
static int UpdateUntilFinished(background_command *c) {
  int waited;
  int finished = 0;

  for (waited=0;waited<10000;waited+=10) {
    finished += UpdateBackgroundCommand(c);
    if (!IsBackgroundCommandRunning(c)) { break; }
    SDL_Delay(10);
  }
  finished += UpdateBackgroundCommand(c);
  return finished;
}

UTEST(launcher_command, reports_finishing_only_once) {
  ASSERT_TRUE(StartBackgroundCommand(&command, ".", "echo hello"));
  ASSERT_EQ(1, UpdateUntilFinished(&command));
}

UTEST(launcher_command, keeps_the_output_once_it_has_finished) {
  ASSERT_TRUE(StartBackgroundCommand(&command, ".", "echo hello"));
  UpdateUntilFinished(&command);
  ASSERT_TRUE(strstr(command.output, "hello") != 0);
}

UTEST(launcher_command, keeps_the_exit_code) {
  ASSERT_TRUE(StartBackgroundCommand(&command, ".", "exit 3"));
  UpdateUntilFinished(&command);
  ASSERT_EQ(3, command.exit_code);
}

UTEST(launcher_command, isnt_running_before_it_starts) {
  background_command never_started = { 0 };

  ASSERT_FALSE(IsBackgroundCommandRunning(&never_started));
  ASSERT_EQ(0, UpdateBackgroundCommand(&never_started));
}

UTEST(launcher_command, isnt_running_after_being_stopped) {
  ASSERT_TRUE(StartBackgroundCommand(&command, ".", WAIT_30_SECONDS));
  StopBackgroundCommand(&command);
  ASSERT_FALSE(IsBackgroundCommandRunning(&command));
}
