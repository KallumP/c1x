import type { Vec3 } from "./objects";

// how a lab assistant's vials fly (stormy ascent's, as its code is patched for
// custom levels: builder/donorObjects.ts), seen in the game, in game units (y
// up): out of its hand, up and over at a speed along the ground, bursting the
// first frame they're below the ground they're over

const HAND_AHEAD = 148.44; // how far in front of the assistant a vial leaves its hand
const HAND_SIDE = 234.38;  // and how far to its side (to +x facing +z)
const HAND_UP = 1211;      // and how high
const HAND_SHIFT_Z = -200; // and then its code moves it along the game's z, whichever way it faces
const UP_SPEED = 3280;     // a vial's speed up as it's thrown (custom levels' first preset's 839680, /256)
const FALL = 531.25;       // how much its speed up drops each frame (136000, /256)
const STEP = 34 / 1024;    // how far a vial goes each frame, of its speed (the game's ticks a frame)
const FRAMES_MAX = 300;    // how long one can fly at most: a landing spot it can't come down onto

// the speed along the game's -x stormy ascent's first throws at (custom levels' first preset's 634880, /256)
const PRESET_SPEED = 2480;

const TURN = 4096;                // the game's angles, a whole turn
const FACING_WITHOUT_WAY = -1024; // back along the game's x, as stormy ascent's first faces
const FLAG_MAX = 32767;           // an init flag is a 16 bit number

// a vial's height over the assistant's feet each frame of its flight, from
// its hand until the first frame it's below ground height up from its feet
export function vialHeights(height: number): number[] {
  const heights = [HAND_UP];
  let speed = UP_SPEED;
  while (heights[heights.length - 1] >= height && heights.length <= FRAMES_MAX) {
    heights.push(heights[heights.length - 1] + speed * STEP);
    speed -= FALL;
  }
  return heights;
}

// how many frames a vial flies before it's below ground height up from the assistant's feet
export const framesToLand = (height: number): number => vialHeights(height).length - 1;

// a vial's flight as the editor draws it (in blender, z up), from over the
// assistant at spot to its landing spot: evenly across, as high as it flies
// each frame, ending on the landing spot
export function vialArc(spot: Vec3, landing: Vec3, scale: number): Vec3[] {
  const heights = vialHeights((landing[2] - spot[2]) * scale);
  const last = heights.length - 1;
  const across = (share: number, axis: number) => spot[axis] + (landing[axis] - spot[axis]) * share;
  const arc = heights.slice(0, last).map((height, frame): Vec3 => [across(frame / last, 0), across(frame / last, 1), spot[2] + height / scale]);
  return [...arc, landing];
}

// where a vial leaves the assistant's hand, along the game's x and z from it,
// for it facing facing (4096 a turn, 0 along +z)
export function handOffset(facing: number): [number, number] {
  const angle = (facing * 2 * Math.PI) / TURN;
  const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
  return [HAND_AHEAD * sin + HAND_SIDE * cos, HAND_AHEAD * cos - HAND_SIDE * sin + HAND_SHIFT_Z];
}

// how far off its vials land on flat ground, thrown as stormy ascent's first (along -x)
export const LAB_ASSISTANT_REACH = HAND_AHEAD + framesToLand(0) * PRESET_SPEED * STEP;

const flag = (value: number) => Math.max(-FLAG_MAX, Math.min(FLAG_MAX, Math.round(value)));

// a lab assistant's init flags (its code patched for custom levels) to throw
// its vials from spot to landing (game units, y up): which way it faces, at
// the landing spot (an angle, 4096 a turn, 0 along the game's +z), and their
// speeds along x and z, from where they leave its hand to the landing spot
export function throwFlags(spot: [number, number, number], landing: [number, number, number]): [number, number, number] {
  const [x, y, z] = [landing[0] - spot[0], landing[1] - spot[1], landing[2] - spot[2]];
  if (Math.hypot(x, z) === 0) {
    return [FACING_WITHOUT_WAY, 0, 0];
  }
  const facing = flag((Math.atan2(x, z) * TURN) / (2 * Math.PI));
  const [handX, handZ] = handOffset(facing);
  const flight = framesToLand(y) * STEP;
  return [facing, flag((x - handX) / flight), flag((z - handZ) / flight)];
}
