#ifndef _TEX_H_
#define _TEX_H_

#include "common.h"
#include "geom.h"
#include "ns.h"
#include "pcgfx.h"

typedef int (*tex_create_callback_t)(dim2, uint8_t*);
typedef void (*tex_delete_callback_t)(int);
typedef void (*tex_subimage_callback_t)(int, rect2, uint8_t*);

extern void TexturesInit(tex_create_callback_t create,
  tex_delete_callback_t delete, tex_subimage_callback_t subimage);
extern void TexturesKill();
extern void TexturesUpdate();
extern int TextureId();
extern int TextureLoad(texinfo *texinfo, fvec(*uvs)[4]);

/* a and b draw the same pixels: their polygons' tint and culling don't matter */
static inline int TexturesShareRegion(const texinfo *a, const texinfo *b) {
  return a->tpage == b->tpage && a->clut_x == b->clut_x && a->clut_y == b->clut_y
    && a->semi_trans == b->semi_trans && a->color_mode == b->color_mode && a->uv_idx == b->uv_idx
    && a->segment == b->segment && a->offs_x == b->offs_x && a->offs_y == b->offs_y;
}
typedef uint16_t (*tex_recolor_t)(uint16_t pixel, const void *owner);
extern int TextureLoadRecolored(texinfo *texinfo, fvec(*uvs)[4], tex_recolor_t recolor, const void *owner);
extern void TexturePageChanged(eid_t eid);
// extern int TexturePageGlobal(tpage *tpage);
extern void TextureCopy(uint8_t *src, uint8_t *dst, dim2 *sdim, dim2 *ddim,
  rect2 *srect, pnt2 *dloc,
  void *clut, int clut_type, int color_mode, int semi_trans);
#endif /* _TEX_H_ */
