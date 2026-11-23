#ifndef _TEST_TOOLS_COMMAND_H_
#define _TEST_TOOLS_COMMAND_H_

/* the project folder the launcher's tools commands are tested with, and the
   tools' path in it as ToolsCommand quotes it: double quotes for cmd.exe, single
   for sh */
#define REPO "C:/games/c1x"
#ifdef _WIN32
#define TOOLS "\"C:/games/c1x/build/c1x_tools.exe\""
#else
#define TOOLS "'C:/games/c1x/build/c1x_tools'"
#endif

#endif /* _TEST_TOOLS_COMMAND_H_ */
