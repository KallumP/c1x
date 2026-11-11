/*
 * the box counter in the game (pc): creates it with the hud and feeds it the
 * boxes broken each frame, when box_display is on. see boxhud.h
 */
#include "boxhud.h"
#include "globals.h"
#include "ns.h"
#include "formats/svtx.h"
#include "pc/settings.h"

#define BOXES_EXEC          34 /* the boxes' exec slot (BoxsC) */
#define PLAIN_CRATE_SEQ     0  /* the plain crate's model (BN10V) in the boxes' anims */
#define CRATE_FACE_TEXINFO  0  /* the crate's front face: its tgeo's first texinfo */
#define HUD_HANDLE          1  /* the handle the hud counters are created under */

extern ns_struct ns;
extern gool_handle handles[8];

static gool_object box_source;          /* the box counter's player link: holds the boxes broken */
static box_hud_icon box_icon;
static gool_object *unset_box_counter;  /* created, but its start code hasn't run yet */

/* the plain crate model's first frame, or 0 when the boxes' code or model isn't loaded */
static svtx_frame *PlainCrateFrame() {
  entry *boxes, *svtx;
  gool_anim *crate;

  boxes = NSOpen(&ns.ldat->exec_map[BOXES_EXEC], 1, 0);
  if (ISERRORCODE(boxes)) { return 0; }
  crate = (gool_anim*)((uint32_t*)boxes->items[5] + PLAIN_CRATE_SEQ);
  if (crate->type != GOOL_ANIM_TYPE_VTX) { return 0; }
  svtx = NSLookup(&crate->v.eid);
  if (ISERRORCODE(svtx)) { return 0; }
  return (svtx_frame*)svtx->items[0];
}

/* the plain crate's front face, or 0 when it isn't loaded */
static tgeo_texinfo *CrateFace() {
  svtx_frame *frame;
  entry *tgeo;
  tgeo_header *header;

  frame = PlainCrateFrame();
  if (!frame) { return 0; }
  tgeo = NSLookup(&frame->tgeo);
  if (ISERRORCODE(tgeo)) { return 0; }
  header = (tgeo_header*)tgeo->items[0];
  return (tgeo_texinfo*)&((uint32_t*)header->texinfos)[CRATE_FACE_TEXINFO];
}

/* remake the icon from the crate's face, which keeps its texture page as loaded now */
static int BoxHudRefreshIcon() {
  tgeo_texinfo *face;

  face = CrateFace();
  if (!face) { return 0; }
  BoxHudMakeIcon(&box_icon, face);
  return 1;
}

/*
 * create the box counter with the other hud counters, when box_display is on
 * and the level has the boxes' code loaded. it starts as a lives counter; it
 * becomes the box counter once its start code has run (BoxHudUpdate)
 */
void BoxHudCreate() {
  gool_object *counter;

  unset_box_counter = 0;
  if (!game_settings.box_display) { return; }
  if (!BoxHudRefreshIcon()) { return; }
  BoxHudShowBoxes(&box_source, box_count);
  counter = GoolObjectCreate(&handles[HUD_HANDLE], HUD_EXEC, HUD_LIVES_SUBTYPE, 0, 0, 0);
  if (ISERRORCODE(counter)) { return; }
  unset_box_counter = counter;
}

/* each frame, after the objects update: feed the box counter the boxes broken */
void BoxHudUpdate() {
  if (!game_settings.box_display) { return; }
  BoxHudShowBoxes(&box_source, box_count);
  BoxHudRefreshIcon();
  if (!unset_box_counter) { return; }
  if (unset_box_counter->state == HUD_START_STATE) { return; }
  BoxHudSetUpCounter(unset_box_counter, &box_source, &box_icon);
  unset_box_counter = 0;
}
