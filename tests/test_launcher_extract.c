#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include "utest.h"
#include "launcher/extract.h"
#include "test_files.h"
#include "test_disc.h"

#define TEST_EXTRACT_REPO "build/test_launcher_extract"

UTEST(launcher_extract, extracts_the_quoted_disc_image) {
  char command[512];

  MakeRepoWithNodeModules(TEST_EXTRACT_REPO);
  ASSERT_TRUE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "C:/games/crash 1.bin",
    command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("npm run extract-streams -- \"C:/games/crash 1.bin\"", command);
#else
  ASSERT_STREQ("npm run extract-streams -- 'C:/games/crash 1.bin'", command);
#endif
}

UTEST(launcher_extract, installs_first_without_node_modules) {
  char command[512];

  ASSERT_TRUE(ExtractStreamsCommand("build/no_such_repo", "crash.bin",
    command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("npm install && npm run extract-streams -- \"crash.bin\"", command);
#else
  ASSERT_STREQ("npm install && npm run extract-streams -- 'crash.bin'", command);
#endif
}

UTEST(launcher_extract, no_command_without_a_disc_image) {
  char command[512];

  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "", command, sizeof(command)));
}

UTEST(launcher_extract, no_command_for_a_path_that_cant_be_quoted) {
  char command[512];

#ifdef _WIN32
  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "crash\".bin", command, sizeof(command)));
#else
  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "crash's.bin", command, sizeof(command)));
#endif
}

#define TEST_EXTRACT_DISC "build/test_extract_disc.iso"
#define TEST_EXTRACT_OUT "build/test_extract_streams"

/* the bytes of a file, how many in length; 0 if it isn't there */
static int ReadTestFile(const char *path, unsigned char *data, int max, int *length) {
  FILE *file = fopen(path, "rb");

  if (!file) { return 0; }
  *length = fread(data, 1, max, file);
  fclose(file);
  return 1;
}

static void RemoveExtractedFiles(void) {
  remove(TEST_EXTRACT_OUT "/s0000009.nsd");
  remove(TEST_EXTRACT_OUT "/s0000009.nsf");
  remove(TEST_EXTRACT_OUT "/readme.txt");
  rmdir(TEST_EXTRACT_OUT);
}

static int ExtractTestDisc(const test_disc *disc, char *message, size_t size) {
  RemoveExtractedFiles();
  WriteTestIso(disc, TEST_EXTRACT_DISC);
  return ExtractStreams(TEST_EXTRACT_DISC, TEST_EXTRACT_OUT, message, size);
}

UTEST(launcher_extract, copies_the_stream_files_in_lower_case) {
  test_disc disc;
  char message[256];
  unsigned char data[4096];
  int length;

  MakeTestDisc(&disc);
  ASSERT_EQ(2, ExtractTestDisc(&disc, message, sizeof(message)));
  ASSERT_TRUE(ReadTestFile(TEST_EXTRACT_OUT "/s0000009.nsd", data, sizeof(data), &length));
  ASSERT_EQ(5, length);
  ASSERT_EQ(0, memcmp("nsd!!", data, 5));
  ASSERT_TRUE(ReadTestFile(TEST_EXTRACT_OUT "/s0000009.nsf", data, sizeof(data), &length));
  ASSERT_EQ(TEST_DISC_SECTOR + 3, length);
  ASSERT_EQ(0xaa, data[0]);
  ASSERT_EQ(0xbb, data[TEST_DISC_SECTOR + 2]);
  ASSERT_FALSE(ReadTestFile(TEST_EXTRACT_OUT "/readme.txt", data, sizeof(data), &length));
  ASSERT_STREQ("Extracted 2 files to " TEST_EXTRACT_OUT ".", message);
}

UTEST(launcher_extract, reads_a_raw_bin) {
  test_disc disc;
  char message[256];

  MakeTestDisc(&disc);
  RemoveExtractedFiles();
  WriteTestBin(&disc, TEST_EXTRACT_DISC);
  ASSERT_EQ(2, ExtractStreams(TEST_EXTRACT_DISC, TEST_EXTRACT_OUT, message, sizeof(message)));
}

UTEST(launcher_extract, something_that_isnt_a_disc_image_is_an_error) {
  test_disc disc;
  char message[256];

  memset(&disc, 0, sizeof(disc));
  disc.count = TEST_DISC_SECTORS;
  ASSERT_EQ(-1, ExtractTestDisc(&disc, message, sizeof(message)));
  ASSERT_TRUE(strstr(message, "not a recognised disc image") != 0);
}

UTEST(launcher_extract, a_disc_image_that_ends_early_is_an_error) {
  test_disc disc;
  char message[256];

  MakeTestDisc(&disc);
  disc.count = 21;
  ASSERT_EQ(-1, ExtractTestDisc(&disc, message, sizeof(message)));
  ASSERT_TRUE(strstr(message, "ends early") != 0);
}

UTEST(launcher_extract, a_missing_disc_image_is_an_error) {
  char message[256];

  ASSERT_EQ(-1, ExtractStreams("build/no_such_disc.iso", TEST_EXTRACT_OUT, message, sizeof(message)));
  ASSERT_TRUE(strstr(message, "Couldn't open") != 0);
}

UTEST(launcher_extract, a_disc_without_the_games_files_is_an_error_and_writes_nothing) {
  test_disc disc;
  char message[256];
  unsigned char data[16];
  int length;

  MakeTestDisc(&disc);
  RemoveStreamFolder(&disc);
  ASSERT_EQ(-1, ExtractTestDisc(&disc, message, sizeof(message)));
  ASSERT_TRUE(strstr(message, ".NSD/.NSF files found") != 0);
  ASSERT_FALSE(ReadTestFile(TEST_EXTRACT_OUT "/s0000009.nsd", data, sizeof(data), &length));
}
