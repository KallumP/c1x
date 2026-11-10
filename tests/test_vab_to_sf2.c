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

/* the soundfont VabToSf2 makes of a one tone vab (to free), and its size */
static uint8_t *ConvertOneToneVab(uint8_t tone_vol, uint8_t prog_vol, size_t *size) {
  uint8_t *vab, *sf2;

  vab = CreateOneToneVab(tone_vol, prog_vol);
  sf2 = calloc(1, SF2_BUFFER_SIZE);
  *size = VabToSf2(vab, sf2);
  free(vab);
  return sf2;
}

/* the data of the first chunk with id in sf2 (setting its size), or 0 */
static uint8_t *FindChunk(uint8_t *sf2, size_t size, const char *id, uint32_t *chunk_size) {
  size_t i;

  for (i=0;i+8<=size;i++) {
    if (memcmp(&sf2[i], id, 4) != 0) { continue; }
    memcpy(chunk_size, &sf2[i+4], 4);
    return &sf2[i+8];
  }
  return 0;
}

/* the amount of the first instrument generator with oper, or NO_GENERATOR */
static int FindInstrumentGenerator(uint8_t *sf2, size_t size, SFGenerator oper) {
  sfInstGenList *gen, *end;
  uint32_t chunk_size;

  gen = (sfInstGenList*)FindChunk(sf2, size, "igen", &chunk_size);
  if (!gen) { return NO_GENERATOR; }
  end = (sfInstGenList*)((uint8_t*)gen + chunk_size);
  for (;gen<end;gen++) {
    if (gen->sfGenOper == oper) { return gen->genAmount.shAmount; }
  }
  return NO_GENERATOR;
}

static int ToneGenerator(uint8_t tone_vol, uint8_t prog_vol, SFGenerator oper) {
  uint8_t *sf2;
  size_t size;
  int amount;

  sf2 = ConvertOneToneVab(tone_vol, prog_vol, &size);
  amount = FindInstrumentGenerator(sf2, size, oper);
  free(sf2);
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

UTEST(vab_to_sf2, a_tone_is_attenuated_by_its_tone_and_program_volumes) {
  ASSERT_EQ(FluidSynthAttenuation(VabVolumeToAttenuation(75, 30)), ToneAttenuation(75, 30));
}

#define LINEAR_VELOCITY_ATTENUATION 480 /* centibels; half fluidsynth's default 960 */

/* the first instrument modulator onto dest in sf2, copied into mod; 0 if none */
static int FindInstrumentModulator(uint8_t *sf2, size_t size, SFGenerator dest, sfInstModList *mod) {
  sfInstModList *record, *end;
  uint32_t chunk_size;

  record = (sfInstModList*)FindChunk(sf2, size, "imod", &chunk_size);
  if (!record) { return 0; }
  end = (sfInstModList*)((uint8_t*)record + chunk_size);
  for (;record<end;record++) {
    if (record->sfModDestOper != dest) { continue; }
    *mod = *record;
    return 1;
  }
  return 0;
}

/*
 * fluidsynth's default velocity modulator attenuates by 960 cB on a concave
 * curve, which squares velocity; the ps1 scales amplitude by velocity, so
 * each tone replaces it (same source, destination and amount source) with
 * half the amount
 */
UTEST(vab_to_sf2, a_tone_scales_its_amplitude_linearly_with_velocity) {
  const sfInstModList expected = {
    .sfModSrcOper = {
      .index = noteOnVel, .cc = 0,
      .direction = 1, /* max to min */
      .polarity = 0, /* unipolar */
      .type = concave
    },
    .sfModDestOper = initialAttenuation,
    .modAmount = LINEAR_VELOCITY_ATTENUATION,
    .sfModAmtSrcOper = { .index = noController },
    .sfModTransOper = 0
  };
  sfInstModList mod;
  uint8_t *sf2;
  size_t size;
  int found;

  sf2 = ConvertOneToneVab(127, 127, &size);
  found = FindInstrumentModulator(sf2, size, initialAttenuation, &mod);
  free(sf2);
  ASSERT_TRUE(found);
  ASSERT_EQ(0, memcmp(&expected, &mod, sizeof(mod)));
}
