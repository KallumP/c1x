#include <string.h>
#include "utest.h"
#include "launcher/disc_image.h"
#include "test_disc.h"

#define TEST_ISO "build/test_disc_image.iso"
#define TEST_BIN "build/test_disc_image.bin"

static int OpenWrittenIso(disc_image *image, const test_disc *disc) {
  WriteTestIso(disc, TEST_ISO);
  return OpenDiscImage(image, TEST_ISO);
}

UTEST(launcher_disc_image, reads_an_isos_sectors) {
  test_disc disc;
  disc_image image;
  unsigned char data[TEST_DISC_SECTOR + 3];

  MakeTestDisc(&disc);
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_TRUE(ReadDiscData(&image, 21, sizeof(data), data));
  ASSERT_EQ(0xaa, data[0]);
  ASSERT_EQ(0xaa, data[TEST_DISC_SECTOR - 1]);
  ASSERT_EQ(0xbb, data[TEST_DISC_SECTOR + 2]);
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, reads_a_raw_bins_sectors) {
  test_disc disc;
  disc_image image;
  unsigned char data[5];

  MakeTestDisc(&disc);
  WriteTestBin(&disc, TEST_BIN);
  ASSERT_TRUE(OpenDiscImage(&image, TEST_BIN));
  ASSERT_TRUE(ReadDiscData(&image, 20, sizeof(data), data));
  ASSERT_EQ(0, memcmp("nsd!!", data, 5));
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, an_image_ending_early_cant_be_read) {
  test_disc disc;
  disc_image image;
  unsigned char data[TEST_DISC_SECTOR + 3];

  MakeTestDisc(&disc);
  disc.count = 21;
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_FALSE(ReadDiscData(&image, 20, sizeof(data), data));
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, a_missing_file_doesnt_open) {
  disc_image image;

  ASSERT_FALSE(OpenDiscImage(&image, "build/no_such_disc.iso"));
}

UTEST(launcher_disc_image, finds_the_root_folder) {
  test_disc disc;
  disc_image image;
  disc_entry root;

  MakeTestDisc(&disc);
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_TRUE(ReadRootFolder(&image, &root));
  ASSERT_EQ(17u, root.lba);
  ASSERT_TRUE(root.is_folder);
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, no_root_folder_without_a_volume) {
  test_disc disc;
  disc_image image;
  disc_entry root;

  memset(&disc, 0, sizeof(disc));
  disc.count = TEST_DISC_SECTORS;
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_FALSE(ReadRootFolder(&image, &root));
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, lists_a_folders_entries_without_dot_entries) {
  test_disc disc;
  disc_image image;
  disc_entry s0 = {"S0", 18, TEST_DISC_SECTOR, 1};
  disc_entry entries[8];

  MakeTestDisc(&disc);
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_EQ(3, ReadFolderEntries(&image, &s0, entries, 8));
  ASSERT_STREQ("S0000009.NSD", entries[0].name);
  ASSERT_EQ(20u, entries[0].lba);
  ASSERT_EQ(5u, entries[0].size);
  ASSERT_FALSE(entries[0].is_folder);
  ASSERT_STREQ("S0000009.NSF", entries[1].name);
  ASSERT_STREQ("README.TXT", entries[2].name);
  CloseDiscImage(&image);
}

UTEST(launcher_disc_image, lists_folders_as_folders) {
  test_disc disc;
  disc_image image;
  disc_entry root;
  disc_entry entries[8];

  MakeTestDisc(&disc);
  ASSERT_TRUE(OpenWrittenIso(&image, &disc));
  ASSERT_TRUE(ReadRootFolder(&image, &root));
  ASSERT_EQ(2, ReadFolderEntries(&image, &root, entries, 8));
  ASSERT_STREQ("S0", entries[0].name);
  ASSERT_TRUE(entries[0].is_folder);
  ASSERT_STREQ("S9", entries[1].name);
  CloseDiscImage(&image);
}
