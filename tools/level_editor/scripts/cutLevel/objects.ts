// a cut level's objects for its level source: crash's spawn, its boxes and an
// end (objects.json), and its platforms as fixed pads in its geometry
import { BOX_HEIGHT } from "../../builder/entities";
import { LEAF_FLOOR } from "../../builder/octree";
import type { Vec3 } from "../../builder/vectors";
import { BOX_TYPES, type BoxType, type LevelObject } from "../../src/objects";
import type { CutEntity, CutLevel } from "./readCutLevel";
import type { CutSolid } from "./collision";
import { reversed, toBlender, upness, type SceneFace, type SceneObject, type SceneOptions } from "./scene";

const CRASH = 0;          // the cut level's entity types: crash,
const BOX = 3;            // its boxes, by the game's box subtypes,
const PLATFORM = 11;      // and its platforms over the acid, a box on each
const END_PAST = 400;     // how far past the last box along the route the end goes, in game units (the cave's floor ends about 1.5 m past it)
const PAD_RADIUS = 300;   // a platform's pad, in game units
const PAD_DEPTH = 400;
const PAD_SIDES = 6;
const GREY = 128;         // a vertex colour that leaves a texture as it is

type Options = Pick<SceneOptions, "centre" | "scale">;

const ofType = (level: CutLevel, type: number) => level.entities.filter((entity) => entity.type === type);

// a box's middle (its entity is its corner), at its bottom
const boxMiddle = ({ at: [x, y, z] }: CutEntity): Vec3 => [x + BOX_HEIGHT / 2, y, z + BOX_HEIGHT / 2];

function boxType(subtype: number): BoxType | number {
  const name = (Object.keys(BOX_TYPES) as BoxType[]).find((type) => BOX_TYPES[type] === subtype);
  return name ?? subtype;
}

const levelObject = (kind: LevelObject["kind"], at: Vec3, more: Partial<LevelObject> = {}): LevelObject => ({ kind, at, raise: 0, stack: 1, ...more });

// the last box along the route (the lowest z), and the end past it, level with it
function endObject(boxes: CutEntity[], options: Options): LevelObject {
  const last = [...boxes].sort((first, second) => first.at[2] - second.at[2])[0];
  const [x, y, z] = boxMiddle(last);
  return levelObject("end", toBlender([x, y, z - END_PAST], options));
}

export function cutLevelObjects(level: CutLevel, options: Options): LevelObject[] {
  const crash = ofType(level, CRASH)[0];
  const boxes = ofType(level, BOX);
  return [
    levelObject("spawn", toBlender(crash.at, options)),
    ...boxes.map((box) => levelObject("box", toBlender(boxMiddle(box), options), { box: boxType(box.subtype) })),
    endObject(boxes, options),
  ];
}

// the box standing on a platform: the one at its place across and along
function boxOn(platform: CutEntity, boxes: CutEntity[]): CutEntity | undefined {
  return boxes.find(({ at }) => at[0] === platform.at[0] && at[2] === platform.at[2]);
}

const padFace = (corners: Vec3[], material: string): SceneFace =>
  ({ corners, uvs: [[0, 0], [1, 0], [0, 1]], colours: [[GREY, GREY, GREY], [GREY, GREY, GREY], [GREY, GREY, GREY]], material });

// a pad's faces: its top (facing up) and its sides (facing out), in blender metres
function padFaces(middle: Vec3, options: Options, material: string): SceneFace[] {
  const ring = (y: number) => Array.from({ length: PAD_SIDES }, (_, side) => {
    const angle = (side / PAD_SIDES) * Math.PI * 2;
    return toBlender([middle[0] + PAD_RADIUS * Math.cos(angle), y, middle[2] + PAD_RADIUS * Math.sin(angle)], options);
  });
  const [top, bottom] = [ring(middle[1]), ring(middle[1] - PAD_DEPTH)];
  const centre = toBlender(middle, options);
  const faces: SceneFace[] = [];
  for (let side = 0; side < PAD_SIDES; side++) {
    const next = (side + 1) % PAD_SIDES;
    faces.push(padFace([centre, top[next], top[side]], material));
    faces.push(padFace([top[side], top[next], bottom[next]], material), padFace([top[side], bottom[next], bottom[side]], material));
  }
  return faces;
}

// the platforms over the acid as fixed pads, their tops where their boxes stand
export function platformPads(level: CutLevel, options: Options, material: string): SceneObject {
  const boxes = ofType(level, BOX);
  const faces = ofType(level, PLATFORM).flatMap((platform) => {
    const top = (boxOn(platform, boxes) ?? platform).at[1];
    const [x, , z] = boxMiddle(platform);
    return padFaces([x, top, z], options, material);
  });
  return { name: "platforms", faces };
}

const COLLISION_FLOOR = "collision_floor"; // solid but not drawn (isCollisionOnly in builder/faces.ts)

// what a solid's footprint and height are, to find one right on top of another
const bottomKey = ({ low, high }: CutSolid) => [low[0], low[2], high[0], high[2], low[1]].join();
const topKey = ({ low, high }: CutSolid) => [low[0], low[2], high[0], high[2], high[1]].join();

// a floor quad over a solid's top, facing up, in blender metres
function topFaces({ low, high }: CutSolid, options: Options, material: string): SceneFace[] {
  const y = high[1];
  const [a, b, c, d] = [[low[0], low[2]], [high[0], low[2]], [high[0], high[2]], [low[0], high[2]]]
    .map(([x, z]) => toBlender([x, y, z], options));
  return [padFace([a, b, c], material), padFace([a, c, d], material)].map(facingUp);
}

// a face turned to face up, if it faces down
function facingUp(face: SceneFace): SceneFace {
  if (upness(face) < 0) {
    return reversed(face);
  }
  return face;
}

// the cut level's own floor (its floor leaves' tops, those without another
// floor leaf right on them) as collision only, filling holes its mesh has but
// its collision didn't: the game never fell through them
export function collisionFloors(level: CutLevel, options: Options, material = "flat_000000"): SceneObject {
  const floors = level.solids.filter(({ leaf }) => leaf === LEAF_FLOOR);
  const bottoms = new Set(floors.map(bottomKey));
  const tops = floors.filter((floor) => !bottoms.has(topKey(floor)));
  return { name: COLLISION_FLOOR, faces: tops.flatMap((floor) => topFaces(floor, options, material)) };
}
