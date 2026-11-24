#include "coop.h"

/* where player two starts, beside player one at lead */
vec CoopBesideLead(vec lead) {
  vec beside = lead;

  beside.x += COOP_BESIDE_DISTANCE;
  return beside;
}
