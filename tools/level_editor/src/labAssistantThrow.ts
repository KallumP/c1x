// how a lab assistant's vials fly (stormy ascent's, as its code is patched for
// custom levels: builder/donorObjects.ts), seen in the game, in game units: out
// of its hand, up and over at a speed along the ground, bursting the first
// frame they're below the ground they're over

const HAND_AHEAD = 148;  // how far in front of the assistant a vial leaves its hand
const HAND_UP = 1211;    // and how high
const UP_SPEED = 3280;   // a vial's speed up as it's thrown (custom levels' first preset's 839680, /256)
const FALL = 531.25;     // how much its speed up drops each frame (136000, /256)
const STEP = 34 / 1024;  // how far a vial goes each frame, of its speed (the game's ticks a frame)
const FRAMES_MAX = 300;  // how long one can fly at most: a landing spot it can't come down onto

// the speed along the ground stormy ascent's first throws at (custom levels' first preset's 634880, /256)
const PRESET_SPEED = 2480;

// how many frames a vial flies before it's below ground height up from the assistant's feet
export function framesToLand(height: number): number {
  let [up, speed, frames] = [HAND_UP, UP_SPEED, 0];
  while (up >= height && frames < FRAMES_MAX) {
    up += speed * STEP;
    speed -= FALL;
    frames++;
  }
  return frames;
}

// how far off its vials land on flat ground, thrown as stormy ascent's first
export const LAB_ASSISTANT_REACH = HAND_AHEAD + framesToLand(0) * PRESET_SPEED * STEP;

const TURN = 4096;           // the game's angles, a whole turn
const FACING_WITHOUT_WAY = -1024; // back along the game's x, as stormy ascent's first faces
const FLAG_MAX = 32767;      // an init flag is a 16 bit number

const flag = (value: number) => Math.max(-FLAG_MAX, Math.min(FLAG_MAX, Math.round(value)));

// a lab assistant's init flags (its code patched for custom levels) to throw
// its vials from spot to landing (game units, y up): which way it faces (an
// angle, 4096 a turn, 0 along the game's +z), and their speeds along x and z
export function throwFlags(spot: [number, number, number], landing: [number, number, number]): [number, number, number] {
  const [x, y, z] = [landing[0] - spot[0], landing[1] - spot[1], landing[2] - spot[2]];
  const distance = Math.hypot(x, z);
  if (distance === 0) {
    return [FACING_WITHOUT_WAY, 0, 0];
  }
  const speed = throwSpeed(distance, y);
  return [flag((Math.atan2(x, z) * TURN) / (2 * Math.PI)), flag((speed * x) / distance), flag((speed * z) / distance)];
}

// the speed along the ground (the units of its init flags) to land a vial
// distance off and height up from the assistant's feet; none nearer than its hand
export function throwSpeed(distance: number, height: number): number {
  return Math.max(0, distance - HAND_AHEAD) / (framesToLand(height) * STEP);
}
