#ifndef _PC_CARD_GAME_H_
#define _PC_CARD_GAME_H_

/* the memory card in the game (pc). see card_game.c */

#define CARD_DISPLAY_FLAG 0x100000 /* in the display flags while one of the game's card screens is up */

extern int CardControl(int op, int part_idx);
extern void CardGameUpdate(void);
extern void CardGameForgetLast(void);
extern void CardGameForgetScreen(void);

#endif /* _PC_CARD_GAME_H_ */
