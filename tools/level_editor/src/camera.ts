// how the follow camera looks at crash in a custom level, as its level.cfg sets
// it: how far from him (times its usual distance) and how far above him it looks
// down from (degrees), and whether it's behind him or beside him for a side-on
// level, shared by the level build and the editor

export const CAMERA_VIEWS = ["behind", "side"] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export interface Camera {
  distance: number; // times the usual distance (CAMERA_UNITS)
  angle: number;    // degrees above crash, along the route behind him
  view: CameraView; // behind crash, or beside him with the route running left to right
}

// the camera as it always was: 1450 behind crash and 1316 above (as on n. sanity
// beach), so about 1958 game units away, 42 degrees above him
export const DEFAULT_CAMERA: Camera = { distance: 1, angle: 42, view: "behind" };

export const CAMERA_DISTANCE_MIN = 0.5;
export const CAMERA_DISTANCE_MAX = 3;
export const CAMERA_ANGLE_MIN = 10;
export const CAMERA_ANGLE_MAX = 80;

export const isCameraDistance = (value: number) => Number.isFinite(value) && value >= CAMERA_DISTANCE_MIN && value <= CAMERA_DISTANCE_MAX;
export const isCameraAngle = (value: number) => Number.isInteger(value) && value >= CAMERA_ANGLE_MIN && value <= CAMERA_ANGLE_MAX;
export const isCameraView = (value: string | undefined): value is CameraView => CAMERA_VIEWS.includes(value as CameraView);

// a side view turns the level three quarters further, so a route built along -z runs along +x
const SIDE_TURN = 270;

// how far the level is turned (degrees), as the build turns its map and objects
// and the editor works out their default paths and facings: level.cfg's turn,
// and a side view's on top
export function levelTurn(turn: number, { view }: Camera): number {
  if (view === "side") {
    return turn + SIDE_TURN;
  }
  return turn;
}
