// crabs' and turtles' paths that leave the floor or run through a wall, which the
// editor warns about: the game walks them along their paths regardless (seen in the game)
import { enemyPath, pathLength, respaced } from "./enemyPaths";
import { hasPath, type EnemyType, type LevelObject, type Vec3 } from "./objects";
import { floorBelow, reachesIntoLevel, type Triangle } from "./overlaps";

const CHECK_STEP = 0.1;    // metres between the places checked along a path
const WALK_HEIGHT = 0.3;   // metres above the path that's checked, clear of the floor it walks on
const CHECK_SIZE = 0.05;   // half the size of the space checked there, metres
const FLOOR_REACH = 0.5;   // how far below the path the floor can be, metres, as it steps down


// the places along an enemy's path to check (blender): every CHECK_STEP, at walking height
function placesAlong(object: LevelObject, turn: number, scale: number): Vec3[] {
  const [x, y, z] = object.at;
  const nodes = enemyPath(object, turn, scale).map(([nodeX, nodeY, nodeZ]): Vec3 =>
    [x + nodeX, y + nodeY, z + object.raise + nodeZ + WALK_HEIGHT]);
  return respaced(nodes, Math.max(2, Math.ceil(pathLength(nodes) / CHECK_STEP) + 1));
}

// the path enemies that hover along their paths, which needn't be over a floor
const HOVERING: EnemyType[] = ["camera_robot", "bird", "flying_camera"];

// whether an object's path needn't be over a floor: a hovering enemy's, or a floating leaf's
const floatsAlong = (object: LevelObject) => object.kind === "obstacle" || HOVERING.includes(object.enemy!);

// whether a place along a path is in a wall
function inWall(place: Vec3, triangles: Triangle[]): boolean {
  const min = place.map((value) => value - CHECK_SIZE) as Vec3;
  const max = place.map((value) => value + CHECK_SIZE) as Vec3;
  return reachesIntoLevel(min, max, triangles);
}

// whether a place along a path has no floor close below it
function offTheFloor(place: Vec3, triangles: Triangle[]): boolean {
  const drop = floorBelow(place, triangles);
  return drop === null || drop > WALK_HEIGHT + FLOOR_REACH;
}

// whether a place along a path is in a wall, or (unless it hovers or floats) has no floor close below it
function strays(object: LevelObject, place: Vec3, triangles: Triangle[]): boolean {
  if (inWall(place, triangles)) {
    return true;
  }
  return !floatsAlong(object) && offTheFloor(place, triangles);
}

// the indices of the path enemies (crabs, turtles, natives) whose paths leave the floor or run through a wall
export function strayingPaths(objects: LevelObject[], turn: number, scale: number, triangles: Triangle[]): Set<number> {
  const straying = new Set<number>();
  objects.forEach((object, index) => {
    if (hasPath(object) && placesAlong(object, turn, scale).some((place) => strays(object, place, triangles))) {
      straying.add(index);
    }
  });
  return straying;
}
