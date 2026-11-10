#include "utest.h"
#include "launcher/game.h"
#include "test_files.h"

UTEST(launcher_game, game_is_in_the_build_folder) {
  char path[256];

  GamePath("/home/me/c1x", path, sizeof(path));
#ifdef _WIN32
  ASSERT_STREQ("/home/me/c1x/build/c1.exe", path);
#else
  ASSERT_STREQ("/home/me/c1x/build/c1", path);
#endif
}

UTEST(launcher_game, a_repo_with_the_game_built_has_it) {
  MakeFolder("build/test_launcher_game");
  MakeFolder("build/test_launcher_game/build");
  WriteWholeFile("build/test_launcher_game/build/" GAME_FILE_NAME, "");
  ASSERT_TRUE(IsGameBuilt("build/test_launcher_game"));
}

UTEST(launcher_game, a_repo_without_the_game_built_doesnt) {
  ASSERT_FALSE(IsGameBuilt("build/no_such_repo"));
}
