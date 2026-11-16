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

#define NOT_LOADED  0
#define NO_PICTURE  -1 /* the picture couldn't be loaded: don't try again */

extern ns_struct ns;

static enhanced_title title;
static int drawn_this_frame; /* the main menu was drawn this frame, after the logo landed */
static int picture_texture = NOT_LOADED;

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

/* the picture as a texture, its pixels as RGBA bytes */
static int LoadPicture(void) {
  SDL_Surface *bmp, *rgba;
  dim2 dim;
  int texture;

  bmp = SDL_LoadBMP(ENHANCED_TITLE_PICTURE);
  if (!bmp) {
    fprintf(stderr, "no %s: %s\n", ENHANCED_TITLE_PICTURE, SDL_GetError());
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

/* after the game's objects are drawn: the picture, if the main menu was drawn */
void EnhancedTitleDraw(void) {
  rect2 at;

  if (!drawn_this_frame) { return; }
  drawn_this_frame = 0;
  if (picture_texture == NOT_LOADED)
    picture_texture = LoadPicture();
  if (picture_texture == NO_PICTURE) { return; }
  at.x = ENHANCED_TITLE_LEFT;
  at.y = ENHANCED_TITLE_TOP;
  at.w = ENHANCED_TITLE_WIDTH;
  at.h = ENHANCED_TITLE_HEIGHT;
  GLDrawPicture(picture_texture, &at);
}
