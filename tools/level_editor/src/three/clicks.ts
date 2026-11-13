import type { ThreeEvent } from "@react-three/fiber";
import type { Vec3 } from "../objects";
import { placeOnFloor, towardsViewer } from "../placing";

const CLICK_PIXELS = 4; // the pointer moving further than this between down and up is orbiting, not a click

export const isClick = (event: ThreeEvent<MouseEvent>) => event.delta <= CLICK_PIXELS;

// only the left button selects and drags objects; the others are the camera's
export const isLeftPress = (event: { button: number }) => event.button === 0;

// the blender position a click on the level places an object at, or null off the floor
export function clickedFloor(event: ThreeEvent<MouseEvent>, grid: number): Vec3 | null {
  if (!event.face) {
    return null;
  }
  const normal = event.face.normal.clone().transformDirection(event.object.matrixWorld).toArray() as Vec3;
  const facing = towardsViewer(normal, event.ray.direction.toArray() as Vec3);
  return placeOnFloor(event.point.toArray() as Vec3, facing, grid);
}
