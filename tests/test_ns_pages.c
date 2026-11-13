#include "utest.h"
#include "ns.h"

/* ns.c references these from the rest of the game */
ns_subsystem subsys[21];
int use_cd = 0;
entry *cur_zone;
eid_t insts[8];
int TitleLoading(lid_t lid, uint8_t *image_data, nsd *nsd) { return 0; }

extern ns_struct ns;

UTEST(ns_files, custom_level_loads_from_its_path) {
  NSSetCustomLevel("build/levels/mock");
  ASSERT_STREQ("build/levels/mock.nsd", NSGetFilename(0, LID_TEST));
  ASSERT_STREQ("build/levels/mock.nsf", NSGetFilename(1, LID_TEST));
  NSSetCustomLevel("");
}

UTEST(ns_files, a_long_custom_level_path_isnt_cut_short) {
  char path[300], nsd[310];

  memset(path, 'a', 299);
  path[299] = 0;
  snprintf(nsd, sizeof(nsd), "%s.nsd", path);
  NSSetCustomLevel(path);
  ASSERT_STREQ(nsd, NSGetFilename(0, LID_TEST));
  NSSetCustomLevel("");
}

UTEST(ns_files, the_games_own_levels_load_from_streams) {
  NSSetCustomLevel("build/levels/mock");
  ASSERT_STREQ("./streams/s0000009.nsd", NSGetFilename(0, LID_NSANITYBEACH));
  NSSetCustomLevel("");
}

UTEST(ns_files, the_test_level_loads_from_streams_without_a_custom_level) {
  NSSetCustomLevel("");
  ASSERT_STREQ("./streams/s0000001.nsf", NSGetFilename(1, LID_TEST));
}

static nsd_ldat ldat; /* big (its loading image), so not on the stack */

/* no custom level, and no box total kept from one */
static void ResetCustomLevel() {
  NSSetCustomLevel("");
  NSKeepBoxTotal(LID_TEST, &ldat);
}

UTEST(ns_box_total, a_custom_level_keeps_its_box_total_while_the_level_end_screen_loads) {
  NSSetCustomLevel("build/levels/mock");
  ldat.box_total = 58;
  NSKeepBoxTotal(LID_TEST, &ldat);
  ldat.box_total = 0;
  NSKeepBoxTotal(LID_NSANITYBEACH, &ldat); /* another level's nsd, such as the end screen's */
  ASSERT_EQ(58, NSCustomBoxTotal());
  ResetCustomLevel();
}

UTEST(ns_box_total, the_games_own_test_level_has_none) {
  ResetCustomLevel();
  ldat.box_total = 7;
  NSKeepBoxTotal(LID_TEST, &ldat);
  ASSERT_EQ(0, NSCustomBoxTotal());
}

static nsd probe_nsd;
static nsd_pte probe_table[3];
static nsd_pte *probe_buckets[NSD_PTB_COUNT];

/* a page table of three entries, all in the bucket the eids hash to (0) */
static void set_probe_table() {
  int i;

  for (i=0;i<3;i++) {
    probe_table[i].pgid = i;
    probe_table[i].eid = 0x10 + i;
  }
  probe_nsd.page_table_size = 3;
  probe_buckets[0] = probe_table;
  ns.nsd = &probe_nsd;
  ns.page_table = probe_table;
  ns.pte_buckets = probe_buckets;
}

UTEST(ns_probe, finds_the_last_entry_in_the_table) {
  set_probe_table();
  ASSERT_EQ(&probe_table[2], NSProbeSafe(0x12));
}

static entry lookup_entries[4];
static nsd_pte lookup_table[4]; /* three in the page table, and one past its end */

/* a page table of three loaded entries (eids are odd), with a fourth entry
   just past its end that the lookup mustn't reach */
static void set_lookup_table() {
  int i;

  for (i=0;i<4;i++) {
    lookup_table[i].entry = &lookup_entries[i];
    lookup_table[i].eid = 0x21 + 2*i;
  }
  probe_nsd.page_table_size = 3;
  probe_buckets[0] = lookup_table;
  ns.nsd = &probe_nsd;
  ns.page_table = lookup_table;
  ns.pte_buckets = probe_buckets;
}

UTEST(ns_lookup, finds_a_loaded_entry_by_its_eid) {
  eid_t eid;

  set_lookup_table();
  eid = 0x23;
  ASSERT_EQ(&lookup_entries[1], NSLookup(&eid));
}

UTEST(ns_lookup, an_eid_not_in_the_page_table_is_an_error) {
  eid_t eid;

  set_lookup_table();
  eid = 0x27; /* only past the end of the table */
  ASSERT_TRUE(ISERRORCODE(NSLookup(&eid)));
}

/* a page's id: its index shifted up, with the low bit set while it's not loaded */
static pgid_t UnloadedPageId(int page_index) {
  return (page_index << 1) | 1;
}

/* leave junk where the next call's locals will go, as the game's own calls would */
static __attribute__((noinline)) void FillStackWithJunk() {
  volatile uint32_t junk[256];
  int i;
  for (i=0;i<256;i++)
    junk[i] = 0x7F7F7F7F;
}

/* NSCountAvailablePages2 once read locals it hadn't set, so each test runs it over junk */
UTEST(ns_pages, no_entries_need_no_pages_despite_junk_left_on_the_stack) {
  FillStackWithJunk();
  ASSERT_EQ(0, NSCountAvailablePages2(0, 0));
}

UTEST(ns_pages, entry_in_an_unloaded_page_needs_one_page) {
  page_struct *page_map[2];
  page_struct **page_map_prev;
  nsd_pte pte;
  entry_ref ref, *list[1];
  int count;

  page_map[1] = (page_struct*)NULL_PAGE; /* page not loaded */
  pte.pgid = UnloadedPageId(1);
  ref.pte = &pte;
  list[0] = &ref;
  page_map_prev = ns.page_map;
  ns.page_map = page_map;
  FillStackWithJunk();
  count = NSCountAvailablePages2(list, 1);
  ns.page_map = page_map_prev;
  ASSERT_EQ(1, count);
}

extern page_struct texture_pages[NS_TEXTURE_PAGE_COUNT];

#define PAGE_FREE 1    /* a page_struct state: free for a page to load into (ns.c) */
#define PAGE_LOADED 20 /* a page_struct state: holding a loaded page */

/* the ps1's vram held 16 texture pages; the pc draws from its own copies of
   the pages, so a level can have a page in any of the slots, and more of them */
UTEST(ns_texture_pages, a_level_can_load_a_texture_page_into_any_of_the_32_slots) {
  int i;

  ASSERT_EQ(32, NS_TEXTURE_PAGE_COUNT);
  memset(texture_pages, 0, sizeof(texture_pages));
  NSInitTexturePages(&ns, LID_TEST);
  for (i = 0; i < NS_TEXTURE_PAGE_COUNT; i++) {
    ASSERT_EQ(PAGE_FREE, texture_pages[i].state);
  }
}

UTEST(ns_texture_pages, a_17th_texture_page_gets_a_slot_of_its_own) {
  int i, slot;

  memset(texture_pages, 0, sizeof(texture_pages));
  for (i = 0; i < NS_TEXTURE_PAGE_COUNT; i++) {
    texture_pages[i].state = PAGE_FREE;
  }
  for (i = 0; i < 16; i++) {
    texture_pages[i].state = PAGE_LOADED;
  }
  slot = NSTexturePageAllocate();
  ASSERT_GE(slot, 16);
  for (i = 0; i < 16; i++) {
    ASSERT_EQ(PAGE_LOADED, texture_pages[i].state); /* none of the 16 put out for it */
  }
  memset(texture_pages, 0, sizeof(texture_pages));
}
