#include "utest.h"
#include "launcher/level_editor.h"

#ifdef _WIN32
#define TOOLS "c1x_tools.exe"
#else
#define TOOLS "c1x_tools"
#endif

UTEST(launcher_level_editor, runs_from_the_tools) {
  char command[512];

  ASSERT_TRUE(LevelEditorCommand("C:/games/c1x", command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("\"C:/games/c1x/build/" TOOLS "\" editor", command);
#else
  ASSERT_STREQ("'C:/games/c1x/build/" TOOLS "' editor", command);
#endif
}
