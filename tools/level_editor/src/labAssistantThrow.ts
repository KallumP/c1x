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

// the speed along the ground (the units of its init flags) to land a vial
// distance off and height up from the assistant's feet; none nearer than its hand
export function throwSpeed(distance: number, height: number): number {
  return Math.max(0, distance - HAND_AHEAD) / (framesToLand(height) * STEP);
}
