#ifndef _TEST_DISC_H_
#define _TEST_DISC_H_

/*
 * small hand-made disc images for the extractor's tests: S0 holding
 * S0000009.NSD ("nsd!!"), S0000009.NSF (2048 0xaa bytes then 3 0xbb) and
 * README.TXT, plus an empty S9
 */
#define TEST_DISC_SECTOR 2048
#define TEST_DISC_SECTORS 24

typedef struct {
  unsigned char sectors[TEST_DISC_SECTORS][TEST_DISC_SECTOR];
  int count; /* sectors written to the image, fewer for one that ends early */
} test_disc;

extern void MakeTestDisc(test_disc *disc);

/* the root folder holding only S9, so no stream files */
extern void RemoveStreamFolder(test_disc *disc);

/* write disc as an .iso (2048 byte sectors) or a raw .bin (2352, mode 2) */
extern void WriteTestIso(const test_disc *disc, const char *path);
extern void WriteTestBin(const test_disc *disc, const char *path);

#endif /* _TEST_DISC_H_ */
