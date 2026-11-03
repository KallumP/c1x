#include "utest.h"
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "launcher/game.h"

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
  FILE *file;

  file = fopen("build/test_launcher_game/build/" GAME_FILE_NAME, "wb");
  if (!file) {
#ifdef _WIN32
    mkdir("build/test_launcher_game");
    mkdir("build/test_launcher_game/build");
#else
    mkdir("build/test_launcher_game", 0777);
    mkdir("build/test_launcher_game/build", 0777);
#endif
    file = fopen("build/test_launcher_game/build/" GAME_FILE_NAME, "wb");
  }
  ASSERT_TRUE(file != 0);
  fclose(file);
  ASSERT_TRUE(IsGameBuilt("build/test_launcher_game"));
}

UTEST(launcher_game, a_repo_without_the_game_built_doesnt) {
  ASSERT_FALSE(IsGameBuilt("build/no_such_repo"));
}
