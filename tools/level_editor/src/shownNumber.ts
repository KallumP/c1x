// a number as the editor's fields show it: to 4 decimal places at most, so a
// sum floating point can't hold exactly (3.3649999999999998) shows as 3.365
const SHOWN_DECIMALS = 10_000;

export const shownNumber = (value: number) => Math.round(value * SHOWN_DECIMALS) / SHOWN_DECIMALS + 0; // + 0 turns -0 into 0
