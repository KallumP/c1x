// how the follow camera looks at crash in a custom level, as its level.cfg sets
// it: how far from him (times its usual distance) and how far above him it looks
// down from (degrees), shared by the level build and the editor

export interface Camera {
  distance: number; // times the usual distance (CAMERA_UNITS)
  angle: number;    // degrees above crash, along the route behind him
}

// the camera as it always was: 1450 behind crash and 1316 above (as on n. sanity
// beach), so about 1958 game units away, 42 degrees above him
export const DEFAULT_CAMERA: Camera = { distance: 1, angle: 42 };

export const CAMERA_DISTANCE_MIN = 0.5;
export const CAMERA_DISTANCE_MAX = 3;
export const CAMERA_ANGLE_MIN = 10;
export const CAMERA_ANGLE_MAX = 80;

export const isCameraDistance = (value: number) => Number.isFinite(value) && value >= CAMERA_DISTANCE_MIN && value <= CAMERA_DISTANCE_MAX;
export const isCameraAngle = (value: number) => Number.isInteger(value) && value >= CAMERA_ANGLE_MIN && value <= CAMERA_ANGLE_MAX;
