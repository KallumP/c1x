#ifndef _PBAK_H_
#define _PBAK_H_

#include "common.h"
#include "ns.h"
#include "formats/pbak.h"

#define PBAK_STATE_CHOSEN 3 /* pbak_state: a demo chosen, its level loading */

extern int PbakInit();
extern int PbakKill();
extern void PbakStart();
extern void PbakPlay(eid_t*);
extern void PbakChoose(eid_t*);

#endif /* _PBAK_H_ */
