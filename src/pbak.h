#ifndef _PBAK_H_
#define _PBAK_H_

#include "common.h"
#include "ns.h"
#include "formats/pbak.h"

/* pbak_state's values */
#define PBAK_STATE_PLAYING 2
/* a demo chosen and its level loading, or one ended and the title loading */
#define PBAK_STATE_CHOSEN  3

extern int PbakInit();
extern int PbakKill();
extern void PbakStart();
extern void PbakPlay(eid_t*);
extern void PbakChoose(eid_t*);

#endif /* _PBAK_H_ */
