#include <string.h>
#include "utest.h"
#include "launcher/release_download.h"
#include "test_tools_command.h"

UTEST(launcher_release_download, runs_from_the_tools_with_the_version) {
  char command[512];

  ASSERT_TRUE(DownloadReleaseCommand(REPO, "1.5", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " download-release 1.5", command);
}

UTEST(launcher_release_download, isnt_run_for_what_isnt_a_version) {
  char command[512];

  ASSERT_FALSE(DownloadReleaseCommand(REPO, "1.5 & calc", command, sizeof(command)));
}

UTEST(launcher_release_download, finds_where_the_zip_was_saved) {
  char path[256];

  ASSERT_TRUE(FindSavedRelease("saved release: C:\\Users\\me\\Downloads\\c1x-1.5.zip\r\n",
    path, sizeof(path)));
  ASSERT_STREQ("C:\\Users\\me\\Downloads\\c1x-1.5.zip", path);
}

UTEST(launcher_release_download, finds_nothing_before_it_says_where) {
  char path[256];

  ASSERT_FALSE(FindSavedRelease("couldn't download c1x 1.5: the download answered 404\n",
    path, sizeof(path)));
}

UTEST(launcher_release_download, finds_nothing_while_the_line_isnt_all_there) {
  char path[256];

  const char *output;

  output = "saved release: C:\\Users\\me\\Down";
  ASSERT_FALSE(FindSavedRelease(output, path, sizeof(path)));
}

UTEST(launcher_release_download, finds_nothing_when_the_path_is_too_long_to_keep) {
  char path[8];

  ASSERT_FALSE(FindSavedRelease("saved release: C:\\Users\\me\\Downloads\\c1x-1.5.zip\n",
    path, sizeof(path)));
}
