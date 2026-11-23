#include <string.h>
#include "utest.h"
#include "launcher/help.h"
#include "test_files.h"

#define TEST_HELP_REPO "build/test_launcher_help"

static const help_page controls_page = { "Controls", "doc/controls.html", "doc/controls.md", "" };

UTEST(launcher_help, a_windows_path_as_a_file_address) {
  char url[256];

  FileUrl("C:\\games\\c1x\\README.html", url, sizeof(url));
  ASSERT_STREQ("file:///C:/games/c1x/README.html", url);
}

UTEST(launcher_help, a_linux_path_as_a_file_address) {
  char url[256];

  FileUrl("/home/me/c1x/README.html", url, sizeof(url));
  ASSERT_STREQ("file:///home/me/c1x/README.html", url);
}

UTEST(launcher_help, spaces_and_hashes_in_a_path_are_escaped) {
  char url[256];

  FileUrl("C:\\my games\\c1x #2\\README.html", url, sizeof(url));
  ASSERT_STREQ("file:///C:/my%20games/c1x%20%232/README.html", url);
}

UTEST(launcher_help, percents_and_other_unsafe_characters_in_a_path_are_escaped) {
  char url[256];

  FileUrl("C:/a%b?c/README.html", url, sizeof(url));
  ASSERT_STREQ("file:///C:/a%25b%3Fc/README.html", url);
}

UTEST(launcher_help, a_release_opens_its_own_page) {
  char url[512];
  const char *page = "doc/controls.html";

  MakeFolder(TEST_HELP_REPO);
  MakeFolder(TEST_HELP_REPO "/doc");
  WriteWholeFile(TEST_HELP_REPO "/doc/controls.html", "<html></html>");
  HelpPageAddress(TEST_HELP_REPO, &controls_page, url, sizeof(url));
  ASSERT_EQ(0, strncmp(url, "file:///", 8));
  ASSERT_STREQ(page, url + strlen(url) - strlen(page));
}

UTEST(launcher_help, a_folder_without_the_page_opens_the_doc_on_github) {
  char url[512];

  HelpPageAddress("build/no_such_repo", &controls_page, url, sizeof(url));
  ASSERT_STREQ("https://github.com/KallumP/c1x/blob/master/doc/controls.md", url);
}

UTEST(launcher_help, the_guide_starts_with_the_players_readme) {
  ASSERT_STREQ("README.html", help_pages[0].release_page);
  ASSERT_STREQ("doc/release/README.md", help_pages[0].repo_doc);
}
