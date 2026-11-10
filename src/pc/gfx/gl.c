/*
 * opengl pc gfx backend
 */
#include <GL/gl.h>
#ifdef _WIN32
/* opengl32.dll only exports gl 1.1; load newer functions at runtime */
#include <GL/glext.h>
static PFNGLACTIVETEXTUREPROC pglActiveTexture;
static PFNGLBLENDEQUATIONPROC pglBlendEquation;
#define glActiveTexture pglActiveTexture
#define glBlendEquation pglBlendEquation
#endif
#include "gl.h"
#include "pcgfx.h"
#include "globals.h"
#include "level.h"
#include "pbak.h"
#include "audio.h"
#include "pc/gfx/tex.h"
#include "pc/gfx/gldepth.h"
#include "pc/settings.h"
#include "pc/time.h"
#include "pc/replay.h"
#include "pc/pace.h"
#include "pc/tween.h"

#ifdef CFLAGS_GUI
#include "ext/gui.h"
#define CIMGUI_USE_OPENGL2
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "cimgui_impl.h"
#endif

int GLCreateTexture(dim2 dim, uint8_t *buf) {
  int texid;

  glGenTextures(1, &texid);
  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, texid);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, dim.w, dim.h, 0,
    GL_RGBA, GL_UNSIGNED_BYTE, buf);
  glBindTexture(GL_TEXTURE_2D, 0);
  return texid;
}

void GLDeleteTexture(int texid) {
  glDeleteTextures(1, &texid);
}

void GLUpdateTexture(int texid, rect2 rect, uint8_t *buf) {
  glBindTexture(GL_TEXTURE_2D, texid);
  glTexSubImage2D(GL_TEXTURE_2D, 0, rect.x, rect.y, rect.w, rect.h,
    GL_RGBA, GL_UNSIGNED_BYTE, buf);
  glBindTexture(GL_TEXTURE_2D, 0);
}

/* a frame's worth of ticks before the first frame is timed, so objects that
 * scale a speed by it when they spawn (a native near the spawn) don't get 0 */
gl_context context = { .ticks_per_frame = 34 };
gl_callbacks callbacks = { 0 };
rect2 screen = { .x = -256, .y = -120, .w = 512, .h = 240 };
prim_struct prim_links[2048];
int image_texid = 0;

extern ns_struct ns;
extern entry *cur_zone;
extern int paused;
extern int draw_count;
extern int rcnt_stopped;
extern uint32_t ticks_elapsed;
extern rgb8 vram_fill_color, next_vram_fill_color;
extern pbak_frame *cur_pbak_frame;

#ifdef CFLAGS_GUI
void GLInitGui() {
  GuiInit();
  ImGui_ImplOpenGL2_Init();
}

void GLKillGui() {
  ImGui_ImplOpenGL2_Shutdown();
}
#endif

int textures_inited=0;
/* gl */
int GLInit(gl_callbacks *_callbacks) {
  rect2 window;
  int i;

  callbacks = *_callbacks;
#ifdef _WIN32
  pglActiveTexture = (PFNGLACTIVETEXTUREPROC)callbacks.proc_addr("glActiveTexture");
  pglBlendEquation = (PFNGLBLENDEQUATIONPROC)callbacks.proc_addr("glBlendEquation");
#endif
#ifdef CFLAGS_GUI
  GLInitGui();
#endif
  TexturesInit(GLCreateTexture, GLDeleteTexture, GLUpdateTexture);
  textures_inited=1;
  screen.x = -256;
  screen.y = -120;
  screen.w = 512;
  screen.h = 240;
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
  return SUCCESS;
}

int GLKill() {
  if (context.prims_head) {
    free(context.prims_head);
    context.prims_head = 0;
  }
  TexturesKill();
  textures_inited=0;
  if (image_texid) {
    GLDeleteTexture(image_texid);
    image_texid = 0;
  }
#ifdef CFLAGS_GUI
  // GLKillGui(); /* removed for now */
#endif
  return SUCCESS;
}

int GLSetupPrims() {
  if (!textures_inited) {
    TexturesInit(GLCreateTexture, GLDeleteTexture, GLUpdateTexture);
    textures_inited=1;
  }
  if (!context.prims_head) // not in orig
    context.prims_head = calloc(1,0x800000);
  GLResetPrims(&context);
  return SUCCESS;
}

void GLResetPrims(gl_context *gc) {
  gc->prims_tail = gc->prims_head;
  GLResetOT(gc->ot, 2048);
}

void GLDrawRect(int x, int y, int w, int h, int r, int g, int b) {
  quad q;
  int i;
  q.p[0].x =   x; q.p[0].y =   y;
  q.p[1].x = x+w; q.p[1].y =   y;
  q.p[3].x =   x; q.p[2].y = y+h;
  q.p[2].x = x+w; q.p[3].y = y+h;
  for (i=0;i<4;i++) {
    q.p[i].x += screen.x;
    q.p[i].y += screen.y;
  }
  glColor4ub(r, g, b, 255);
  glBegin(GL_QUADS);
  for (i=0;i<4;i++)
    glVertex3i(q.p[i].x, -q.p[i].y, -1);
  glEnd();
  glColor4ub(255, 255, 255, 255);
}

void GLDrawOverlay(int brightness) {
  quad q;
  int i, adj[16];
  adj[0] = 12; adj[1] = 25; adj[2] = 38; adj[3] = 51;
  adj[4] = 64; adj[5] = 77; adj[6] = 91; adj[7] =105;
  adj[8] =120; adj[9] =135; adj[10]=151; adj[11]=167;
  adj[12]=185; adj[13]=203; adj[14]=225; adj[15]=255;
  if (brightness) {
    brightness = limit(brightness>>4,1,16)-1;
    brightness = adj[brightness];
    q.p[0].x = -256; q.p[0].y = -120;
    q.p[1].x =  256; q.p[1].y = -120;
    q.p[3].x = -256; q.p[2].y =  120;
    q.p[2].x =  256; q.p[3].y =  120;
    glEnable(GL_BLEND);
    glColor4ub(0, 0, 0, brightness);
    glBegin(GL_QUADS);
    for (i=0;i<4;i++)
      glVertex3i(q.p[i].x, -q.p[i].y, -1);
    glEnd();
    glDisable(GL_BLEND);
    glColor4ub(255, 255, 255, 255);
  }
}

void GLDrawImage(dim2 *dim, uint8_t *buf, pnt2 *loc) {
  quad q;
  rect2 rect;
  pnt2 _loc;
  int i;

  rect.x=0;rect.y=0;
  rect.dim = *dim;
  if (image_texid)
    GLDeleteTexture(image_texid);
  image_texid = GLCreateTexture(rect.dim, buf);
  q.p[0].x =      0; q.p[0].y =      0;
  q.p[1].x = dim->w; q.p[1].y =      0;
  q.p[3].x =      0; q.p[2].y = dim->h;
  q.p[2].x = dim->w; q.p[3].y = dim->h;
  if (!loc) {
    loc = &_loc;
    loc->x = (int32_t)-dim->w/2; /* centered */
    loc->y = (int32_t)-dim->h/2;
  }
  for (i=0;i<4;i++) {
    q.p[i].x += loc->x;
    q.p[i].y += loc->y;
  }
  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, image_texid);
  glEnable(GL_TEXTURE_2D);
  glBegin(GL_QUADS);
  glColor4ub(255, 255, 255, 255);
  for (i=0;i<4;i++) {
    glTexCoord2f((i%3)?1.0:0, (i/2)?1.0:0);
    glVertex3i(q.p[i].x, -q.p[i].y, -1);
  }
  glEnd();
  glDisable(GL_TEXTURE_2D);
  glBindTexture(GL_TEXTURE_2D, 0);
}

/*
 * clear the screen, draw an rgba image centered and show it immediately.
 * used for the level loading screen, which is drawn outside the frame loop
 * (so this doesn't use GLClear, which reads the current zone)
 */
void GLShowImage(dim2 *dim, uint8_t *buf) {
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
  glMatrixMode(GL_PROJECTION);
  glLoadIdentity();
  glFrustum(screen.x, screen.x+screen.w, screen.y, screen.y+screen.h,
            1.0, 100000.0);
  glMatrixMode(GL_MODELVIEW);
  glLoadIdentity();
  GLDrawImage(dim, buf, 0);
  if (callbacks.post_update)
    (*callbacks.post_update)();
}

/*
 * tris are drawn in runs: tris drawn with the same gl state are gathered
 * into a vertex array, drawn (GLEndTris) before the state changes (pc; a
 * glBegin per tri, a call per vertex, took most of a frame)
 */
typedef struct {
  float x, y, z;
  float u, v;
  rgba color; /* as glColor3ui: full range, alpha unused */
} gl_tri_vertex;

static gl_tri_vertex *run_verts = 0;
static int run_len = 0, run_size = 0;

static void GLEndTris() {
  if (!run_len) { return; }
  glVertexPointer(3, GL_FLOAT, sizeof(gl_tri_vertex), &run_verts[0].x);
  glTexCoordPointer(2, GL_FLOAT, sizeof(gl_tri_vertex), &run_verts[0].u);
  glColorPointer(3, GL_UNSIGNED_INT, sizeof(gl_tri_vertex), &run_verts[0].color);
  glDrawArrays(GL_TRIANGLES, 0, run_len);
  run_len = 0;
}

/* room in the run for count more vertices */
static void GLMakeRoomForTris(int count) {
  gl_tri_vertex *verts;
  int size;

  if (run_len + count <= run_size) { return; }
  size = (run_size + count) * 2;
  verts = realloc(run_verts, size * sizeof(gl_tri_vertex));
  if (!verts) { return; }
  run_verts = verts;
  run_size = size;
}

/* draw a tri; model tris (depth != 0) are placed at the gl depth of their vertex depths plus z_offs */
static void GLDrawTri(poly3i *poly, int depth, int z_offs) {
  gl_tri_vertex *vert;
  int ii;

  GLMakeRoomForTris(3);
  if (run_len + 3 > run_size) { return; } /* out of memory */
  for (ii=0;ii<3;ii++) {
    vert = &run_verts[run_len++];
    vert->color = poly->colors[ii];
    vert->u = poly->uvs[ii].x;
    vert->v = poly->uvs[ii].y;
    vert->x = poly->verts[ii].x;
    vert->y = poly->verts[ii].y;
    if (depth)
      vert->z = -GLDepthFromZ(poly->verts[ii].z + z_offs);
    else
      vert->z = -1;
  }
}

/* the gl state tris are drawn with, so it's only changed when a tri needs it changed */
typedef struct {
  int lines;    /* polygon mode: lines (1), filled (0), or not set yet (-1) */
  int blend;    /* GLPrimBlendMode */
  int texid;    /* bound texture, or -1 for untextured */
  int depth_on; /* depth testing */
} gl_tri_state;

static void GLSetPolygonMode(gl_tri_state *state, int lines) {
  if (lines == state->lines) { return; }
  GLEndTris();
  if (lines)
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
  else
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
  state->lines = lines;
}

static void GLSetBlendMode(gl_tri_state *state, int mode) {
  if (mode == state->blend) { return; }
  GLEndTris();
  if (mode == 2) { glBlendEquation(GL_FUNC_REVERSE_SUBTRACT); }
  else if (state->blend == 2)  { glBlendEquation(GL_FUNC_ADD); }
  switch (mode) {
  case 0:
  case 3:
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    break;
  case 1:
    glBlendFunc(GL_ONE, GL_ONE);
    break;
  case 2:
    glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_COLOR);
    break;
  }
  state->blend = mode;
}

static void GLSetTexture(gl_tri_state *state, int texid) {
  if (texid == state->texid) { return; }
  GLEndTris();
  if (texid == -1) { glDisable(GL_TEXTURE_2D); }
  else {
    if (state->texid == -1) { glEnable(GL_TEXTURE_2D); }
    glBindTexture(GL_TEXTURE_2D, texid);
    glTexEnvf(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_COMBINE);
    glTexEnvf(GL_TEXTURE_ENV, GL_COMBINE_RGB, GL_MODULATE);
    glTexEnvf(GL_TEXTURE_ENV, GL_COMBINE_ALPHA, GL_MODULATE);
    glTexEnvf(GL_TEXTURE_ENV, GL_RGB_SCALE, 2.0f);
  }
  state->texid = texid;
}

static void GLSetDepthTest(gl_tri_state *state, int depth) {
  if (depth == state->depth_on) { return; }
  GLEndTris();
  if (depth) { glEnable(GL_DEPTH_TEST); }
  else { glDisable(GL_DEPTH_TEST); }
  state->depth_on = depth;
}

/* drawn tris whose depth is still to be written (see GLWriteTriDepths) */
static poly3i **depth_tris = 0;
static int depth_len = 0, depth_size = 0;

static void GLQueueTriDepth(poly3i *poly) {
  poly3i **tris;
  int size;

  if (depth_len == depth_size) {
    size = (depth_size + 1) * 2;
    tris = realloc(depth_tris, size * sizeof(poly3i*));
    if (!tris) { return; }
    depth_tris = tris;
    depth_size = size;
  }
  depth_tris[depth_len++] = poly;
}

/*
 * write the queued tris' depths, for fully opaque texels only, pushed back by
 * the tolerance so that a model only just behind one (e.g. a shadow on a
 * crate top, or crash's feet on the ground) can still draw over it. they're
 * held back until a tri that is depth tested is drawn, or the end (pc): tris
 * that aren't depth tested don't read depth, and depths written with
 * GL_LEQUAL keep the nearest whatever their order, so a run of them can be
 * written at once instead of a few gl calls per tri
 */
static void GLWriteTriDepths(gl_tri_state *state) {
  int i;

  if (!depth_len) { return; }
  GLEndTris();
  GLSetPolygonMode(state, 0);
  if (!state->depth_on) { glEnable(GL_DEPTH_TEST); }
  glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
  glDepthMask(GL_TRUE);
  glEnable(GL_ALPHA_TEST);
  for (i=0;i<depth_len;i++) {
    GLSetTexture(state, depth_tris[i]->texid); /* alpha tested against its texels */
    GLDrawTri(depth_tris[i], 1, GL_DEPTH_TOLERANCE);
  }
  GLEndTris();
  glDisable(GL_ALPHA_TEST);
  glDepthMask(GL_FALSE);
  glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
  if (!state->depth_on) { glDisable(GL_DEPTH_TEST); }
  depth_len = 0;
}

/* whether the tri's depth is written after it is drawn */
static int GLTriWritesDepth(poly3i *poly, int depth, int custom_level) {
  if (depth && game_settings.fix_model_draw_order && GLPrimWritesDepth(poly->flags))
    return 1;
  return poly->type == 1 && GLPrimLevelWritesDepth(poly->flags, custom_level);
}

static void GLBeginPrims() {
  glEnableClientState(GL_VERTEX_ARRAY);
  glEnableClientState(GL_TEXTURE_COORD_ARRAY);
  glEnableClientState(GL_COLOR_ARRAY);
  glActiveTexture(GL_TEXTURE0);
  glDisable(GL_TEXTURE_2D);
  glEnable(GL_BLEND);
  /*
   * model tris are depth tested against each other (fix_model_draw_order)
   * and, in custom levels, against the level (see GL_PRIM_LEVEL); they
   * don't write depth while drawing, see GLWriteTriDepths
   */
  glDisable(GL_DEPTH_TEST);
  glDepthFunc(GL_LEQUAL);
  glDepthMask(GL_FALSE);
  glAlphaFunc(GL_GEQUAL, 1.0f);
}

static void GLEndPrims() {
  GLEndTris();
  glDisableClientState(GL_VERTEX_ARRAY);
  glDisableClientState(GL_TEXTURE_COORD_ARRAY);
  glDisableClientState(GL_COLOR_ARRAY);
  glDisable(GL_DEPTH_TEST);
  glDepthMask(GL_TRUE); /* so glClear clears depth */
  glDisable(GL_BLEND);
  glDisable(GL_TEXTURE_2D);
  glBindTexture(GL_TEXTURE_2D, 0);
  glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
  glBlendEquation(GL_FUNC_ADD);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
}

void GLDrawPrims(void *data, int count) {
  gl_tri_state state;
  poly3i *poly;
  int i, depth, custom_level;

  state.lines = -1;
  state.blend = 3;
  state.texid = -1;
  state.depth_on = 0;
  custom_level = ns.ldat && ns.ldat->lid == LID_TEST;
  poly = (poly3i*)data;
  GLBeginPrims();
  for (i=0;i<count;i++,poly++) {
    depth = poly->type == 1 && GLPrimModelDepthTested(poly->flags,
      game_settings.fix_model_draw_order, custom_level);
    if (depth)
      GLWriteTriDepths(&state); /* it reads the depths drawn before it */
    GLSetPolygonMode(&state, poly->type == 3);
    GLSetBlendMode(&state, GLPrimBlendMode(poly->flags));
    GLSetTexture(&state, poly->texid);
    GLSetDepthTest(&state, depth);
    GLDrawTri(poly, depth, 0);
    if (GLTriWritesDepth(poly, depth, custom_level))
      GLQueueTriDepth(poly);
  }
  GLWriteTriDepths(&state);
  GLEndPrims();
}

void **GLGetPrimsTail() {
  return &context.prims_tail;
}

void GLResetOT(void *ot, int len) {
  prim_struct *link;
  int i;

  link = (prim_struct*)ot;
  for (i=0;i<len;i++,link++) {
    link->type = 0;
    link->next = link+1;
  }
}

void GLAddPrim(void *prim, int idx) {
  prim_struct *ps, *it, *next;

  ps = (prim_struct*)prim;
  if (!context.ot[idx]) { return; }
  for (it=context.ot[idx];(next=PRIM_NEXT(it))&&next->type;it=next);
  PRIM_SETNEXT(it,ps);
  PRIM_SETNEXT(ps,next);
}

/*
 * until another solution is found, for now it is necessary to convert all primitives
 * which are processed by glDrawArrays to triangles, in their order in the OT.
 *
 * alternatives are to
 * 1) a) iterate the OT and group contiguous primitives of the same type;
 *    b) perform a glDrawArrays call for each group
 * 2) manually generate tris instead of quads in sw gfx code
 */
void *trimem=0;
static void GLConvertToTris(void *ot, poly3i **tris, int *count) {
  prim_struct *prim;
  poly3i tri;
  size_t size;
  uint8_t *src, *dst;
  int i, j, k;
  int ot_idx, idx;

  if (count)
    *count = 0;
  context.prims_tail = context.prims_head;
  /* iterate ot and compute total size of converted tris */
  src = (uint8_t*)ot;
  prim = (prim_struct*)src;
  size = 0;
  while (prim) {
    if (prim->type == 1) { size += sizeof(poly3i); }
    else if (prim->type >= 2) { size += sizeof(poly3i)*2; }
    prim = (prim_struct*)PRIM_NEXT(prim);
  }
  if (trimem==0)
    trimem=calloc(1,0x800000);
  *tris=trimem;
  prim = (prim_struct*)src;
  src = (uint8_t*)prim;
  dst = (uint8_t*)*tris;
  ot_idx = 0;
  while (src = (uint8_t*)prim) {
    if (prim->type == 1) {
      *(poly3i*)dst = *(poly3i*)src;
#ifdef CFLAGS_GFX_SW_PERSP
      if (!GLPrimDepthTested(((poly3i*)src)->flags)
        && !(((poly3i*)src)->flags & GL_PRIM_LEVEL)) /* model and level tris keep their depth */
        for (i=0;i<3;i++)
          ((poly3i*)dst)->verts[i].z = -1;
#endif
      dst += sizeof(poly3i);
      ++(*count);
    }
    else if (prim->type >= 2) {
      int idxs[4] = {0,1,3,2};
      for (j=0;j<2;j++) {
        for (k=0;k<3;k++) {
          idx = idxs[((j*2)+k)%4];
          tri.type = prim->type == 2 ? 1: 3;
          tri.next = 0;
          tri.verts[k] = ((poly4i*)src)->verts[idx];
#ifdef CFLAGS_GFX_SW_PERSP
          tri.verts[k].z = -1;
#endif
          tri.colors[k] = ((poly4i*)src)->colors[idx];
          tri.texid = ((poly4i*)src)->texid;
          if (prim->type == 3) {
            tri.texid = -1;
            tri.type = 3;
          }
          tri.flags = ((poly4i*)src)->flags;
          tri.uvs[k] = ((poly4i*)src)->uvs[idx];
        }
        *(poly3i*)dst = tri;
        dst += sizeof(poly3i);
        ++(*count);
      }
    }
    else if (prim->type == 0) { ot_idx++; }
    prim = (prim_struct*)PRIM_NEXT(prim);
  }
  dst = (uint8_t*)*tris;
  for (i=0;i<*count;i++) {
    for (j=0;j<3;j++) {
      ((poly3i*)dst)->verts[j].y = -((poly3i*)dst)->verts[j].y;
      ((poly3i*)dst)->colors[j].a = ~0; /* for now */
    }
    dst += sizeof(poly3i);
  }
}

static void GLDraw(void *ot) {
  poly3i *tris;
  int count;

  GLConvertToTris(ot, &tris, &count);
  GLDrawPrims(tris, count);
}

int GLRoundTicks(int ticks) {
  if (ticks < 0)
    return 34;
  if (ticks < 19)
    return 17; /* 1/2 frame */
  if (ticks < 36)
    return 34; /* 1 frame */
  if (ticks < 53)
    return 51; /* 1 1/2 frames */
  return ticks;
}

void GLClear() {
  zone_header *header;
  rgb8 fill;
  int fh;

  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
  glLoadIdentity();
  // glViewport(0, 0, screen.w, screen.h);
  glMatrixMode(GL_PROJECTION);
  glLoadIdentity();
  /*
   * same x/y mapping as a frustum at z=-1 (where everything else is drawn),
   * but model tris drawn at z=-(gl depth) keep their depth (0 to 0.5)
   */
  glOrtho(screen.x, screen.x+screen.w, screen.y, screen.y+screen.h,
          0.0, 2.0);
  glMatrixMode(GL_MODELVIEW);
  glLoadIdentity();
  if (!(cur_display_flags & 0x80000)) {
    /* fill bg color(s) */
    header = (zone_header*)cur_zone->items[0];
    fh = header->vram_fill_height;
    if (cur_display_flags & 0x2000) {
      fill = vram_fill_color;
      GLDrawRect(0,  12+0, 512,     fh, fill.r, fill.g, fill.b); /* top color */
      fill = header->vram_fill;
      GLDrawRect(0, 12+fh, 512, 216-fh, fill.r, fill.g, fill.b); /* bottom color */
    }
    else {
      GLDrawRect(0,  12+0, 512, 216, 0, 0, 0);
    }
  }
}

/* pc: how long this frame lasts (see pc/pace.h), counting frames from when the level changed */
static int32_t GLFrameTicks() {
  static lid_t lid = -1;
  static uint32_t frame = 0;

  if (!ns.ldat) { return FRAME_TICKS; }
  if (ns.ldat->lid != lid) {
    lid = ns.ldat->lid;
    frame = 0;
  }
  return FrameTicks(lid, frame++);
}

/* brightness: draw the fade overlay and move the fade on a step */
static void GLDrawFade() {
  if (fade_counter == 0) { return; }
  if (fade_counter < -2) {
    fade_counter += fade_step;
    GLDrawOverlay(fade_counter + 256);
    if (fade_counter == 0 && !(cur_display_flags & 0x200000))
      fade_counter = -2;
  }
  else if (fade_counter < 0) {
    GLDrawOverlay(256);
    fade_counter = -1;
  }
  else {
    fade_counter -= fade_step;
    GLDrawOverlay(fade_counter);
  }
}

/* pc: draw the fade overlay as it is, for a frame between game frames */
static void GLDrawFadeStill() {
  if (fade_counter == 0) { return; }
  if (fade_counter < -2)
    GLDrawOverlay(fade_counter + 256);
  else if (fade_counter < 0)
    GLDrawOverlay(256);
  else
    GLDrawOverlay(fade_counter);
}

/* simulate draw area clipping behavior in orig impl */
static void GLDrawBorders() {
  GLDrawRect(0, 0, 512, 12, 0, 0, 0);
  GLDrawRect(0, 228, 512, 12, 0, 0, 0);
}

/*
 * pc: drawing frames between game frames (see pc/tween.h). the game sets
 * tween_draw to draw the terrain and objects part way from the last game
 * frame; frames are drawn while GLUpdate waits for the next game frame
 */
static void (*tween_draw)(int32_t alpha) = 0;
static tween_pacer tween_pace = { 0, 0 }; /* when frames between are due */
static int tween_frames_drawn = 0; /* frames drawn between since the last game frame */

void GLSetTweenDraw(void (*draw)(int32_t alpha)) {
  tween_draw = draw;
}

/* whether to draw frames between game frames, now */
static int GLIsTweening() {
  if (!tween_draw || game_settings.frame_rate <= SETTINGS_FRAME_RATE_MIN) { return 0; }
  if (TimeGetSpeed() != 1) { return 0; } /* a fast replay */
  if (!ns.ldat || ns.ldat->lid == LID_TITLE) { return 0; } /* the title screen draws more than objects */
  return ns.draw_skip_counter == 0 && pbak_state == 0;
}

/*
 * how long the last frame (between, or the game's own) took to draw and
 * show, in real ticks, so a frame between is only started with time to
 * finish it before the game frame is due
 */
static int32_t draw_ticks = 0;
static int32_t draw_start = 0;

static void GLStartTimingDraw() {
  draw_start = TimeRealTicks();
}

static void GLStopTimingDraw() {
  draw_ticks = TimeRealTicks() - draw_start;
}

/*
 * draw (and show) a frame alpha of the way from the last game frame, into the
 * prims after the game frame's, then put the game frame's ot back
 */
static void GLDrawTweenFrame(int32_t alpha) {
  static gl_context game_frame;

  game_frame = context;
  GLResetOT(context.ot, 2048);
  GLClear();
  (*tween_draw)(alpha);
  TexturesUpdate();
  GLDraw(context.ot);
  GLDrawFadeStill();
  GLDrawBorders();
#ifdef CFLAGS_GUI
  if (igGetDrawData())
    ImGui_ImplOpenGL2_RenderDrawData(igGetDrawData()); /* the last game frame's */
#endif
  if (callbacks.post_update)
    (*callbacks.post_update)();
  context = game_frame;
}

/* draw a frame between game frames if one is due, elapsed ticks into a game frame of ticks */
static void GLDrawBetweenFrames(int32_t elapsed, int32_t ticks) {
  uint32_t rate;

  rate = game_settings.frame_rate;
  if (!TweenFrameDue(&tween_pace, elapsed, ticks, rate, draw_ticks)) { return; }
  TweenPacerDrew(&tween_pace, elapsed, rate);
  tween_frames_drawn++;
  GLStartTimingDraw();
  GLDrawTweenFrame(TweenAlpha(elapsed, ticks));
  GLStopTimingDraw();
}

/* wait until the game frame is due, frame_ticks after the last, drawing frames between if on */
static void GLWaitForFrame(int32_t frame_ticks) {
  void (*between)(int32_t, int32_t);
  int32_t elapsed;

  tween_frames_drawn = 0;
  between = 0;
  if (GLIsTweening())
    between = GLDrawBetweenFrames;
  if (TimeIsFixed()) /* recording or replaying inputs? */
    TimeWaitFrameWith(frame_ticks, between);
  else {
    while ((elapsed = GetTicksElapsed() - context.draw_stamp) < frame_ticks) {
      if (between) { (*between)(elapsed, frame_ticks); }
    }
  }
  TweenPacerNextGameFrame(&tween_pace, frame_ticks, game_settings.frame_rate);
}

void GLUpdate() {
  zone_header *header;
  rgb8 fill;
  int fh;
  int ticks_elapsed, elapsed_since, frame_ticks;
  gl_input gl_input;

  if (callbacks.pre_update)
    (*callbacks.pre_update)();
  ReplayUpdate(); /* record (or replay) the buttons for the next frame */
  if (callbacks.input) {
    (*callbacks.input)(&gl_input);
  }
#ifdef CFLAGS_GUI
  ImGui_ImplOpenGL2_NewFrame();
#endif
  cur_display_flags = next_display_flags;  /* copy display/animate flags */
  vram_fill_color = next_vram_fill_color;
  if (!paused && (cur_display_flags & 0x1000))
    draw_count++;
  AudioUpdate();
  ticks_elapsed = GetTicksElapsed();
  context.sync_stamp = ticks_elapsed;
  if (pbak_state == 0 && !TimeIsFixed())
    ticks_cur_frame = ticks_elapsed - context.draw_stamp; /* time elapsed between current sync and previous draw  */
  else
    ticks_cur_frame = 17; /* default to 17 */
  frame_ticks = GLFrameTicks(); /* pc: 34, unless drawing at the PS1's pace */
  GLWaitForFrame(frame_ticks);
  if (pbak_state == 2)
    SetTicksElapsed(cur_pbak_frame->ticks_elapsed);
  ticks_elapsed = GetTicksElapsed();
  elapsed_since = ticks_elapsed - context.draw_stamp; /* time elapsed between draws */
  context.draw_stamp = ticks_elapsed;
  context.ticks_per_frame = GLRoundTicks(elapsed_since); /* record rounded tick count */
  GLStartTimingDraw();
  TexturesUpdate();
  if (tween_frames_drawn)
    GLClear(); /* the frames drawn between left their own picture */
  if (ns.draw_skip_counter > 0)
    ns.draw_skip_counter--;
  if (ns.draw_skip_counter == 0)
    GLDraw(context.ot);
  GLResetPrims(&context);
  GLDrawFade();
  GLDrawBorders();
#ifdef CFLAGS_GUI
  GuiUpdate();
  GuiDraw();
  ImGui_ImplOpenGL2_RenderDrawData(igGetDrawData());
#endif
  if (callbacks.post_update)
    (*callbacks.post_update)();
  GLStopTimingDraw();
}
