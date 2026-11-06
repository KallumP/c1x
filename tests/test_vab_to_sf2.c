#include <stdlib.h>
#include <string.h>
#include "utest.h"
#include "pc/sound/util.h"
#include "pc/sound/formats/psx.h"
#include "pc/sound/formats/sf2.h"

#define VAB_BUFFER_SIZE 0x10000
#define SF2_BUFFER_SIZE 0x100000
#define NO_GENERATOR -1

/* a vab with one program of one tone over all keys, and one blank wave */
static uint8_t *CreateOneToneVab(uint8_t tone_vol, uint8_t prog_vol) {
  VabA *va;
  VabB *vb;
  VagAtr *tone;

  va = calloc(1, VAB_BUFFER_SIZE);
  memcpy(va->hdr.form, "VABp", 4);
  va->hdr.ps = 1;
  va->hdr.ts = 1;
  va->hdr.vs = 1;
  va->atrs[0].tones = 1;
  va->atrs[0].mvol = prog_vol;
  tone = &va->vagatrs[0][0];
  tone->vol = tone_vol;
  tone->pan = 64;
  tone->center = 60;
  tone->min = 0;
  tone->max = 127;
  tone->vag = 1;
  vb = (VabB*)&va->vagatrs[1];
  vb->wave_sizes[0] = sizeof(VagLine) >> 3;
  return (uint8_t*)va;
}

/* the amount of the first instrument generator with oper, or NO_GENERATOR */
static int FindInstrumentGenerator(uint8_t *sf2, size_t size, SFGenerator oper) {
  sfInstGenList *gen, *end;
  uint32_t chunk_size;
  size_t i;

  for (i=0;i+8<=size;i++) {
    if (memcmp(&sf2[i], "igen", 4) != 0) { continue; }
    memcpy(&chunk_size, &sf2[i+4], 4);
    gen = (sfInstGenList*)&sf2[i+8];
    end = (sfInstGenList*)&sf2[i+8+chunk_size];
    for (;gen<end;gen++) {
      if (gen->sfGenOper == oper) { return gen->genAmount.shAmount; }
    }
  }
  return NO_GENERATOR;
}

static int ToneGenerator(uint8_t tone_vol, uint8_t prog_vol, SFGenerator oper) {
  uint8_t *vab, *sf2;
  size_t size;
  int amount;

  vab = CreateOneToneVab(tone_vol, prog_vol);
  sf2 = calloc(1, SF2_BUFFER_SIZE);
  size = VabToSf2(vab, sf2);
  amount = FindInstrumentGenerator(sf2, size, oper);
  free(sf2);
  free(vab);
  return amount;
}

static int ToneAttenuation(uint8_t tone_vol, uint8_t prog_vol) {
  return ToneGenerator(tone_vol, prog_vol, initialAttenuation);
}

UTEST(vab_to_sf2, a_tone_keeps_its_root_key) {
  ASSERT_EQ(60, ToneGenerator(127, 127, overridingRootKey));
}

UTEST(vab_to_sf2, a_full_volume_tone_is_not_attenuated) {
  ASSERT_EQ(0, ToneAttenuation(127, 127));
}

UTEST(vab_to_sf2, a_quieter_tone_is_attenuated_by_its_volume) {
  ASSERT_EQ(VabVolumeToAttenuation(75, 127), ToneAttenuation(75, 127));
}

UTEST(vab_to_sf2, a_quieter_program_attenuates_its_tones) {
  ASSERT_EQ(VabVolumeToAttenuation(127, 30), ToneAttenuation(127, 30));
}
