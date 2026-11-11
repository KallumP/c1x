/*
 * how many boxes each level has to break (pc), for the box counter
 */
#include "boxtotals.h"
#include "ns.h"

typedef struct {
  uint32_t lid;
  int total;
} level_box_total;

/*
 * the game's own levels' box totals, as the level end screen (GamOC, exec 52)
 * keeps them: a chain of "if the ended level is this one, the total is this".
 * levels without a box gem (bosses, bonus rounds, the great hall) aren't in it
 */
static const level_box_total game_level_box_totals[] = {
  { LID_CORTEXPOWER,       41 },
  { LID_GENERATORROOM,     44 },
  { LID_HEAVYMACHINERY,    33 },
  { LID_TOXICWASTE,        26 },
  { LID_NSANITYBEACH,      49 },
  { LID_JUNGLEROLLERS,     38 },
  { LID_BOULDERS,          16 },
  { LID_UPSTREAM,          14 },
  { LID_HOGWILD,           24 },
  { LID_THEGREATGATE,      26 },
  { LID_BOULDERDASH,       35 },
  { LID_ROADTONOWHERE,     33 },
  { LID_ROLLINGSTONES,     46 },
  { LID_THEHIGHROAD,       18 },
  { LID_UPTHECREEK,        15 },
  { LID_NATIVEFORTRESS,    42 },
  { LID_TEMPLERUINS,       67 },
  { LID_JAWSOFDARKNESS,    65 },
  { LID_WHOLEHOG,          24 },
  { LID_THELOSTCITY,       26 },
  { LID_STORMYASCENT,      34 },
  { LID_SUNSETVISTA,       50 },
  { LID_LIGHTSOUT,         15 },
  { LID_THELAB,            24 },
  { LID_FUMBLINGINTHEDARK, 18 },
  { LID_SLIPPERYCLIMB,     31 },
  { LID_CASTLEMACHINERY,   24 },
};

#define GAME_LEVEL_BOX_TOTAL_COUNT \
  (int)(sizeof(game_level_box_totals) / sizeof(game_level_box_totals[0]))

/* a game level's box total, or 0 for a level without a box gem */
int GameLevelBoxTotal(uint32_t lid) {
  int i;

  for (i=0;i<GAME_LEVEL_BOX_TOTAL_COUNT;i++) {
    if (game_level_box_totals[i].lid == lid) { return game_level_box_totals[i].total; }
  }
  return 0;
}
