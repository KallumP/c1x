/*
 * N-Hanced under the logo on the game's title screen (pc): follows its
 * objects to see when the logo has landed, and draws the picture on the
 * frames the main menu is drawn. see enhancedtitle.h
 */
#include <SDL2/SDL.h>
#include "enhancedtitle.h"
#include "gool.h"
#include "ns.h"
#include "pc/gfx/gl.h"
#include "pc/settings.h"

#define NOT_LOADED  0
#define NO_PICTURE  -1 /* the picture couldn't be loaded: don't try again */

extern ns_struct ns;

static enhanced_title title;
static int drawn_this_frame; /* the main menu was drawn this frame, after the logo landed */
static int picture_texture = NOT_LOADED;
static int coop_texture = NOT_LOADED;

static int IsOnTitleScreen(void) {
  return ns.ldat && ns.ldat->lid == LID_TITLE;
}

/* the main menu has loaded: its logo swings in again */
void EnhancedTitleLoaded(void) {
  EnhancedTitleReset(&title);
}

/* each object as it updates */
void EnhancedTitleSeeObject(gool_object *obj) {
  if (!IsOnTitleScreen()) { return; }
  EnhancedTitleNoteObject(&title, obj->subtype, obj->status_b);
}

/* each piece of title screen text as it's drawn */
void EnhancedTitleSeeMenuText(const char *menu_text) {
  if (!IsOnTitleScreen()) { return; }
  if (EnhancedTitleDrawsWith(&title, menu_text))
    drawn_this_frame = 1;
}

/* a picture as a texture, its pixels as RGBA bytes */
static int LoadPicture(const char *path) {
  SDL_Surface *bmp, *rgba;
  dim2 dim;
  int texture;

  bmp = SDL_LoadBMP(path);
  if (!bmp) {
    fprintf(stderr, "no %s: %s\n", path, SDL_GetError());
    return NO_PICTURE;
  }
  rgba = SDL_ConvertSurfaceFormat(bmp, SDL_PIXELFORMAT_ABGR8888, 0);
  SDL_FreeSurface(bmp);
  if (!rgba) { return NO_PICTURE; }
  dim.w = rgba->w;
  dim.h = rgba->h;
  texture = GLCreatePictureTexture(dim, (uint8_t*)rgba->pixels);
  SDL_FreeSurface(rgba);
  return texture;
}

/* returns 0 if the picture couldn't be loaded */
static int DrawPicture(int *texture, const char *path, void (*place)(rect2 *at)) {
  rect2 at;

  if (*texture == NOT_LOADED)
    *texture = LoadPicture(path);
  if (*texture == NO_PICTURE) { return 0; }
  (*place)(&at);
  GLDrawPicture(*texture, &at);
  return 1;
}

/* after the game's objects are drawn: the pictures, if the main menu was drawn */
void EnhancedTitleDraw(void) {
  int n_hanced_shown;

  if (!drawn_this_frame) { return; }
  drawn_this_frame = 0;
  n_hanced_shown = DrawPicture(&picture_texture, ENHANCED_TITLE_PICTURE, EnhancedTitleAt);
  if (EnhancedTitleShowsCoop(n_hanced_shown, game_settings.two_players))
    DrawPicture(&coop_texture, ENHANCED_TITLE_COOP_PICTURE, EnhancedTitleCoopAt);
}
