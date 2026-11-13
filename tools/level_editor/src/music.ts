// the music a custom level plays: a level of the game's own whose music the
// builder copies in (set in a level source's level.cfg as music). levels that
// share a song are under the first with it, in the order they're played
export interface Soundtrack {
  name: string;         // as level.cfg spells it
  label: string;        // as the editor lists it
  lid: number;          // the level it's copied from (its files in streams/)
  akuAkuSong: boolean;  // whether it has a second track, the song aku aku's invincibility plays
}

const track = (name: string, label: string, lid: number, akuAkuSong = true): Soundtrack => ({ name, label, lid, akuAkuSong });

export const SOUNDTRACKS: Soundtrack[] = [
  track("n_sanity_beach", "N. Sanity Beach", 0x9),
  track("jungle_rollers", "Jungle Rollers, Rolling Stones", 0xc),
  track("the_great_gate", "The Great Gate, Native Fortress", 0x12),
  track("boulders", "Boulders, Boulder Dash", 0xe, false),
  track("upstream", "Upstream, Up the Creek", 0xf),
  track("papu_papu", "Papu Papu", 0xa, false),
  track("hog_wild", "Hog Wild, Whole Hog", 0x11, false),
  track("road_to_nowhere", "Road to Nowhere, The High Road", 0x14),
  track("ripper_roo", "Ripper Roo", 0x17, false),
  track("temple_ruins", "Temple Ruins, Jaws of Darkness", 0x1c),
  track("the_lost_city", "The Lost City, Sunset Vista", 0x20),
  track("koala_kong", "Koala Kong", 0x21, false),
  track("heavy_machinery", "Heavy Machinery, Castle Machinery", 0x6),
  track("generator_room", "Generator Room", 0x5),
  track("toxic_waste", "Toxic Waste", 0x7),
  track("pinstripe", "Pinstripe", 0x8, false),
  track("cortex_power", "Cortex Power", 0x3),
  track("lights_out", "Lights Out, Fumbling in the Dark", 0x28, false),
  track("stormy_ascent", "Stormy Ascent, Slippery Climb", 0x22),
  track("the_lab", "The Lab", 0x29),
  track("the_great_hall", "The Great Hall", 0x2c, false),
  track("dr_n_brio", "Dr. N. Brio", 0x1b, false),
  track("dr_neo_cortex", "Dr. Neo Cortex", 0x1f, false),
  track("bonus_round", "Bonus round (Tawna)", 0x24, false),
];

export const DEFAULT_MUSIC = "jungle_rollers"; // what custom levels always played

export const isMusicName = (name: string) => SOUNDTRACKS.some((soundtrack) => soundtrack.name === name);

// the soundtrack called name (one of SOUNDTRACKS)
export function soundtrack(name: string): Soundtrack {
  const found = SOUNDTRACKS.find((soundtrack) => soundtrack.name === name);
  if (!found) {
    throw new Error(`there's no soundtrack called ${name}`);
  }
  return found;
}
