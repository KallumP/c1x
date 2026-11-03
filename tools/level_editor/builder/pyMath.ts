// python's rounding, floor division and modulo (as CPython works them out), so
// the level build's numbers come out exactly as the python build's did

// round(x): the nearest whole number, halves to the even one
export function roundHalfToEven(x: number): number {
  const rounded = Math.round(x); // halves up
  const isHalf = Math.abs(x - Math.trunc(x)) === 0.5;
  if (isHalf && rounded % 2 !== 0) {
    return rounded - 1 + 0; // + 0 turns -0 into 0
  }
  return rounded + 0;
}

// x // y (float_floor_div in CPython): worked out from the remainder, as
// Math.floor(x / y) is sometimes one more (1 // 0.1 is 9, not 10)
export function floorDivide(x: number, y: number): number {
  let remainder = x % y; // C's fmod: exact, with x's sign
  let quotient = (x - remainder) / y;
  if (remainder !== 0 && y < 0 !== remainder < 0) {
    remainder += y;
    quotient -= 1;
  }
  if (quotient === 0) {
    return 0;
  }
  let floored = Math.floor(quotient);
  if (quotient - floored > 0.5) {
    floored += 1;
  }
  return floored;
}

// x % y: the remainder with y's sign
export function pythonModulo(x: number, y: number): number {
  const remainder = x % y;
  if (remainder !== 0 && y < 0 !== remainder < 0) {
    return remainder + y;
  }
  return remainder + 0;
}
