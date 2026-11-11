// a level's objects, each drawn where the game puts it, sized by the level's scale
import { Edges, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { batSwoop, blenderToView, labAssistantThrow, leaderBatsFlight, boxSize, cameraFacing, enemyTurn, facingFrom, fishLeap, mossySlideEnd, stackCentres, stonePath, stoneRolling, STONE_TRACK } from "../coords";
import { boxStyle, ENEMY_COLOURS, OBSTACLE_COLOURS, SELECTED_COLOUR, SPAWN_COLOUR, WARNING_COLOUR, type BoxStyle } from "../objectStyles";
import { BARREL_SHAPE, ENEMY_SHAPES, partGeometry, shapeBounds, type ShapePart } from "../enemyShapes";
import { CRASH_SHAPE, WARP_PAD_SHAPE } from "../markerShapes";
import { OBSTACLE_SHAPES } from "../obstacleShapes";
import { handleLifts, nodesUnderEnds, pathPositions, pointAlongShare, spotAndNode } from "../enemyPaths";
import { vialArc } from "../labAssistantThrow";
import { isPathEnemy, PATH_ENEMIES, type LevelObject, type PathEnemy, type Vec3 } from "../objects";
import { floorAbove, type Triangle } from "../overlaps";

const CRASH_UNITS = 665; // crash's height in game units (MAP_SCALE's comment in builder/makeMap.ts)
const STONE_THICKNESS = 0.35; // of the rolling stone's radius
const TRACK_OPACITY = 0.25;   // of the outline of a rolling stone's track
const BOX_EDGE_COLOUR = "#000000";
const HANDLE_SIZE = 0.15;   // a path node's handle's radius, of a box's size
const FAR_END_OPACITY = 0.4; // the enemy drawn at the far end of its path, faded: it starts at the other
const SELECTED_GLOW = 0.35; // how much brighter the selected enemy's model is
const PLANK_WIDTH = 1100;    // a mossy slide's plank across its slope, game units (the great gate's, about)
const PLANK_THICKNESS = 120;

// how big a crab's and turtle's models are, in game units: how tall, and how
// far they reach out from their middles, whichever way they're turned. the
// handles of the nodes under the models at the ends of their paths float
// above them (and a little more), so they can be clicked
const walkerSize = (parts: ShapePart[]) => {
  const { min, max } = shapeBounds(parts);
  return { height: max[1], reach: Math.max(-min[0], max[0], -min[2], max[2]) };
};
// the path enemies that turn to face the way they go (seen in the game)
const FACES_ITS_WAY: PathEnemy[] = ["turtle", "warthog", "monkey", "lizard", "red_lizard", "walking_lizard", "robot_dog", "electric_scientist"];

const WALKER_SIZES = Object.fromEntries(PATH_ENEMIES.map((enemy) => [enemy, walkerSize(ENEMY_SHAPES[enemy])])) as Record<PathEnemy, ReturnType<typeof walkerSize>>;
const LEAF_SIZE = walkerSize(OBSTACLE_SHAPES.leaf); // a leaf's, as a walker's, for the handles of the nodes under it

// how far a leader bat's and a bat's tops are above their spots, in game units: their handles float over them
const LEADER_BAT_TOP = shapeBounds(ENEMY_SHAPES.leader_bats).max[1];
const BAT_TOP = shapeBounds(ENEMY_SHAPES.bat).max[1];
const LANDING_SIZE = 0.35;   // a lab assistant's landing spot's ring's radius, of a box's size
const VIAL_COLOUR = "#d0409a"; // its vials' pink, for their flight and landing spot

// the enemies that stay at their spot, drawn there
const SPOT_ENEMIES = ["plant", "blue_river_plant", "green_river_plant", "spider", "snake", "gunman"] as const;
type SpotEnemy = (typeof SPOT_ENEMIES)[number];
const isSpotEnemy = (enemy: string | undefined): enemy is SpotEnemy => SPOT_ENEMIES.some((spotEnemy) => spotEnemy === enemy);

// where an object's base is in the viewport, raised as it is in the game
function base(object: LevelObject): Vec3 {
  const [x, y, z] = object.at;
  return blenderToView([x, y, z + object.raise]);
}

export default function ObjectMarkers({ objects, scale, turn, selected, selectedNode, warnings, pathWarnings, triangles, onSelect, onSelectNode }: {
  objects: LevelObject[];
  scale: number;
  turn: number; // the level's, which sets the way the spawn's arrow points
  selected: number | null;
  selectedNode: number | null; // a node of the selected crab's or turtle's path
  warnings: Set<number>; // the boxes in a wall or another box
  pathWarnings: Set<number>; // the path enemies whose paths leave the floor or run through a wall
  triangles: Triangle[]; // the level's (in blender), to raise the handles of path nodes under the ground
  onSelect: (index: number) => void;
  onSelectNode: (index: number, node: number) => void;
}) {
  // a path's line: red if it leaves the floor or runs through a wall, else its own colour
  const pathColour = (index: number, colour: string) => {
    if (pathWarnings.has(index)) {
      return WARNING_COLOUR;
    }
    return colour;
  };

  // a box in a wall or another box has red edges, the selected object white, the rest their own colour
  const edgeColour = (index: number, colour: string) => {
    if (warnings.has(index)) {
      return WARNING_COLOUR;
    }
    return index === selected ? SELECTED_COLOUR : colour;
  };

  // pressing on an object grabs it; its click stops here, so it doesn't reach
  // the level behind it (which would clear the selection, or place an object)
  const grab = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(index);
  };
  const stopClick = (event: ThreeEvent<MouseEvent>) => event.stopPropagation();

  // pressing on a path's node's handle grabs the node, not its enemy
  const grabNode = (index: number, node: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelectNode(index, node);
  };

  const renderBox = (centre: Vec3, style: BoxStyle, edges: string, key: number) => {
    const size = boxSize(scale) * 0.98;
    return (
      <mesh key={key} position={blenderToView(centre)}>
        <boxGeometry args={[size, size, size]} />
        <meshLambertMaterial color={style.colour} transparent={style.wireframe} opacity={style.wireframe ? 0.15 : 1} />
        <Edges color={edges} lineWidth={style.wireframe ? 2 : 1.5} />
      </mesh>
    );
  };

  const renderBoxStack = (object: LevelObject, index: number) => {
    const style = boxStyle(object.box!);
    const centres = stackCentres(object.at, object.raise, object.stack, scale);
    const edges = edgeColour(index, BOX_EDGE_COLOUR);
    return (
      <>{centres.map((centre, boxIndex) => renderBox(centre, style, edges, boxIndex))}</>
    );
  };

  // an arrow on the floor in front of crash, pointing the way the camera faces (along its -z)
  const renderSpawnArrow = (height: number) => {
    const [dx, , dz] = blenderToView(cameraFacing(turn));
    const lift = height / 50; // above the floor, so it isn't hidden in it
    const shaftStart = height / 5;
    const shaftLength = height / 2;
    const headLength = height / 3;
    return (
      <group rotation={[0, Math.atan2(-dx, -dz), 0]}>
        <mesh position={[0, lift, -(shaftStart + shaftLength / 2)]}>
          <boxGeometry args={[height / 12, lift, shaftLength]} />
          <meshLambertMaterial color={SPAWN_COLOUR} />
        </mesh>
        <mesh position={[0, lift, -(shaftStart + shaftLength + headLength / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[height / 6, headLength, 12]} />
          <meshLambertMaterial color={SPAWN_COLOUR} />
        </mesh>
      </group>
    );
  };

  const renderSpawn = (object: LevelObject, index: number) => {
    const height = CRASH_UNITS / scale;
    const facingAway = enemyTurn(turn) + Math.PI; // crash faces the way the camera does, into the level
    return (
      <>
        {renderShapeModel(CRASH_SHAPE, base(object), index, undefined, facingAway)}
        <group position={base(object)}>{renderSpawnArrow(height)}</group>
      </>
    );
  };

  const renderEnd = (object: LevelObject, index: number) => renderShapeModel(WARP_PAD_SHAPE, base(object), index);

  const renderShapePart = (part: ShapePart, partIndex: number, glow: number, opacity: number) => (
    <mesh key={partIndex} geometry={partGeometry(part)}>
      <meshLambertMaterial
        color={part.colour}
        emissive={SELECTED_COLOUR}
        emissiveIntensity={glow}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );

  // an enemy's model standing at at (in the viewport), facing the player, sized by the level's
  // scale; the selected one glows
  // opacity below 1 fades it: the far end of a crab's or turtle's path, where it turns round
  const renderShapeModel = (parts: ShapePart[], at: Vec3, index: number, key?: number, facing = enemyTurn(turn), opacity = 1) => {
    const glow = index === selected ? SELECTED_GLOW : 0;
    return (
      <group key={key} position={at} rotation={[0, facing, 0]} scale={1 / scale}>
        {parts.map((part, partIndex) => renderShapePart(part, partIndex, glow, opacity))}
      </group>
    );
  };

  // an enemy that stays where it's placed, facing the player: a plant, a river plant, a spider hanging there, a cobra or a gunman
  const renderAtSpot = (object: LevelObject, index: number, enemy: SpotEnemy) => renderShapeModel(ENEMY_SHAPES[enemy], base(object), index);

  // a fish: at its spot, where it leaps from, facing the way it leaps (across the
  // map, or back reversed), with the line of its leap, and faded where it lands
  const renderFish = (object: LevelObject, index: number) => {
    const leap = fishLeap(object.at, object.raise, turn, scale, object.reverse === true);
    const [start, end] = [leap[0], leap[leap.length - 1]];
    const facing = facingFrom(start, end, turn);
    return (
      <>
        {renderShapeModel(ENEMY_SHAPES.fish, blenderToView(start), index, 0, facing)}
        {renderShapeModel(ENEMY_SHAPES.fish, blenderToView(end), index, 1, facing, FAR_END_OPACITY)}
        <Line points={leap.map(blenderToView)} color={ENEMY_COLOURS.fish} lineWidth={2} />
      </>
    );
  };

  // a bat roost: a bat at the roost, where its bats fly from, facing the way they
  // swoop (to its path's node, by default towards the spawn), with the line of
  // their swoop, and faded where it ends, with a handle there to drag the end by
  // while it's selected
  const renderBat = (object: LevelObject, index: number) => {
    const [roost, end] = spotAndNode(object, turn, scale);
    const swoop = batSwoop(roost, end, turn, scale);
    const facing = facingFrom(roost, end, turn);
    return (
      <>
        {renderShapeModel(ENEMY_SHAPES.bat, blenderToView(roost), index, 0, facing)}
        {renderShapeModel(ENEMY_SHAPES.bat, blenderToView(end), index, 1, facing, FAR_END_OPACITY)}
        <Line points={swoop.map(blenderToView)} color={ENEMY_COLOURS.bat} lineWidth={2} />
        {index === selected && renderPathHandle(end, index, 0, ENEMY_COLOURS.bat, BAT_TOP / scale)}
      </>
    );
  };

  // leader bats' second leader's handle, over it, while they're selected (the
  // first is the object, dragged as any other)
  const renderSecondLeaderHandle = (second: Vec3, index: number) =>
    renderPathHandle(second, index, 0, ENEMY_COLOURS.leader_bats, LEADER_BAT_TOP / scale);

  // a lab assistant: at its spot, facing the way it throws its vials across the map
  // which way a lab assistant faces: at its landing spot, or as stormy
  // ascent's first (back along the game's x) with it right under it
  const labAssistantFacing = (spot: Vec3, landing: Vec3) => {
    if (spot[0] === landing[0] && spot[1] === landing[1]) {
      const way = labAssistantThrow(turn);
      return facingFrom(spot, spot.map((value, axis) => value + way[axis]) as Vec3, turn);
    }
    return facingFrom(spot, landing, turn);
  };

  // a ring on the ground where a lab assistant's vials land
  const renderLandingSpot = (landing: Vec3) => {
    const radius = boxSize(scale) * LANDING_SIZE;
    const [x, y, z] = blenderToView(landing);
    return (
      <mesh position={[x, y + boxSize(scale) / 50, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.6, radius, 24]} />
        <meshBasicMaterial color={VIAL_COLOUR} side={2} />
      </mesh>
    );
  };

  // a lab assistant: at its spot, facing where its vials land, with their
  // flight there, a ring where they land, and a handle on it while it's selected
  const renderLabAssistant = (object: LevelObject, index: number) => {
    const [spot, landing] = spotAndNode(object, turn, scale);
    return (
      <>
        {renderShapeModel(ENEMY_SHAPES.lab_assistant, blenderToView(spot), index, undefined, labAssistantFacing(spot, landing))}
        <Line points={vialArc(spot, landing, scale).map(blenderToView)} color={VIAL_COLOUR} lineWidth={2} />
        {renderLandingSpot(landing)}
        {index === selected && renderPathHandle(landing, index, 0, VIAL_COLOUR)}
      </>
    );
  };

  // leader bats: their two leaders, the first where the object is (solid,
  // where the bats come in) and the second at its path's node (faded, where
  // they go out; with a handle to drag it by while they're selected), and the
  // line of their bats' flight between them
  const renderLeaderBats = (object: LevelObject, index: number) => {
    const [first, second] = spotAndNode(object, turn, scale);
    const flight = leaderBatsFlight(first, second, turn, scale);
    const leaderOpacities = [1, FAR_END_OPACITY];
    return (
      <>
        {[first, second].map((spot, leader) =>
          renderShapeModel(ENEMY_SHAPES.leader_bats, blenderToView(spot), index, leader, enemyTurn(turn), leaderOpacities[leader]))}
        <Line points={flight.map(blenderToView)} color={ENEMY_COLOURS.leader_bats} lineWidth={2} />
        {index === selected && renderSecondLeaderHandle(second, index)}
      </>
    );
  };

  // the rolling stone: a wheel where it starts along its track, turned to roll across the map as the game rolls it
  const renderStone = (object: LevelObject, index: number) => {
    const radius = STONE_TRACK.radius / scale;
    // stonePath runs the other way round from the game's path (seen in the game: start 0 is at
    // the other end); the track looks the same either way, so only where the stone starts shows it
    const path = [...stonePath(object.at, object.raise, turn, scale)].reverse().map(blenderToView);
    const [rollX, , rollZ] = blenderToView(stoneRolling(turn));
    return (
      <group position={pointAlongShare(path, object.start ?? 0)}>
        <mesh rotation={[0, Math.atan2(rollX, rollZ), Math.PI / 2]}>
          <cylinderGeometry args={[radius, radius, radius * STONE_THICKNESS, 20]} />
          <meshLambertMaterial color={OBSTACLE_COLOURS.rolling_stone} />
          <Edges color={edgeColour(index, OBSTACLE_COLOURS.rolling_stone)} />
        </mesh>
        {renderStoneArrow(object, path, radius)}
      </group>
    );
  };

  // the track a rolling stone comes with: its outline on the floor, and the line its middle rolls along
  // an arrow over a rolling stone, the way it rolls first from where it starts: on
  // towards its path's last point, or back towards its first if it's reversed
  // (only back from its last point, and only on from its first)
  const renderStoneArrow = (object: LevelObject, path: Vec3[], radius: number) => {
    const start = object.start ?? 0;
    const isRollingBack = start >= 1 || (start > 0 && object.reverse === true);
    const at = pointAlongShare(path, start);
    const ahead = pointAlongShare(path, isRollingBack ? start - 0.05 : start + 0.05);
    const size = boxSize(scale);
    return (
      <group position={[0, radius + size * 0.3, 0]} rotation={[0, Math.atan2(at[0] - ahead[0], at[2] - ahead[2]), 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[size * 0.15, size * 0.4, 12]} />
          <meshBasicMaterial color={OBSTACLE_COLOURS.rolling_stone} />
        </mesh>
      </group>
    );
  };

  const renderStoneTrack = (object: LevelObject) => {
    const [rollX, , rollZ] = blenderToView(stoneRolling(turn));
    const [x, y, z] = base(object);
    const lift = boxSize(scale) / 50; // above the floor, so it isn't hidden in it
    const path = stonePath(object.at, object.raise, turn, scale).map(blenderToView);
    const colour = OBSTACLE_COLOURS.rolling_stone;
    return (
      <>
        <mesh position={[x, y + lift, z]} rotation={[0, Math.atan2(rollX, rollZ), 0]}>
          <boxGeometry args={[STONE_TRACK.width / scale, lift, STONE_TRACK.length / scale]} />
          <meshBasicMaterial color={colour} transparent opacity={TRACK_OPACITY} />
        </mesh>
        <Line points={path} color={colour} lineWidth={2} />
      </>
    );
  };

  // a handle on one of a path's nodes, a little above the floor there; white if it's selected
  // floating lift metres up (clear of the enemy standing there, or out of the ground), on a thin line down to the node
  const renderPathHandle = (position: Vec3, index: number, nodeIndex: number, colour: string, lift = 0) => {
    const radius = boxSize(scale) * HANDLE_SIZE;
    const [x, y, z] = blenderToView(position);
    let height = 0;
    if (lift > 0) {
      height = lift + 2 * radius;
    }
    const handleColour = nodeIndex === selectedNode ? SELECTED_COLOUR : colour;
    return (
      <group key={`node ${nodeIndex}`}>
        <mesh position={[x, y + height + radius, z]} onPointerDown={grabNode(index, nodeIndex)}>
          <sphereGeometry args={[radius, 12, 8]} />
          <meshBasicMaterial color={handleColour} />
        </mesh>
        {height > 0 && <Line points={[[x, y, z], [x, y + height, z]]} color={handleColour} lineWidth={1} />}
      </group>
    );
  };

  // the handles on a path's nodes: those under the enemy (or leaf, size) at
  // either end above it, and those under the ground above the floor
  const renderPathHandles = (positions: Vec3[], index: number, size: ReturnType<typeof walkerSize>, colour: string) => {
    const { height, reach } = size;
    const underEnds = nodesUnderEnds(positions, reach / scale);
    const depths = positions.map((position) => floorAbove(position, triangles));
    const lifts = handleLifts(underEnds, depths, height / scale);
    return positions.map((position, nodeIndex) => renderPathHandle(position, index, nodeIndex, colour, lifts[nodeIndex]));
  };

  // which way an enemy at an end of its path faces: a turtle, warthog, monkey, lizard or robot dog back into
  // its path (it turns to face the way it goes, seen in the game); a badger,
  // walking spider or blob the way it runs (into its path at the start, on out
  // of it at the far end, where it goes down out of sight); a crab or native the player
  const endFacing = (enemy: PathEnemy, end: Vec3, next: Vec3, endIndex: number) => {
    const runsOnce = enemy === "badger" || enemy === "walking_spider" || enemy === "barrel_roller" || enemy === "blob";
    if (FACES_ITS_WAY.includes(enemy) || (runsOnce && endIndex === 0)) {
      return facingFrom(end, next, turn);
    }
    if (runsOnce) {
      return facingFrom(next, end, turn);
    }
    return enemyTurn(turn);
  };

  // what's drawn at an end of an enemy's path: the enemy, but a barrel at the far
  // end of a barrel roller's, where his barrels roll to (he stays at the first)
  const endShape = (enemy: PathEnemy, endIndex: number) => {
    if (enemy === "barrel_roller" && endIndex === 1) {
      return BARREL_SHAPE;
    }
    return ENEMY_SHAPES[enemy];
  };

  // a crab, turtle, native or badger: at the first and last nodes of its path,
  // where it turns round (or a badger dives away), with the line through its
  // nodes, and a handle on each node while it's selected. the far end is faded,
  // as it starts at the other
  const renderPathWalker = (object: LevelObject, index: number) => {
    const enemy = object.enemy as PathEnemy;
    const colour = ENEMY_COLOURS[enemy];
    const lift = boxSize(scale) / 50; // above the floor, so it isn't hidden in it
    const positions = pathPositions(object, turn, scale);
    const last = positions.length - 1;
    const ends = [{ end: positions[0], next: positions[1] }, { end: positions[last], next: positions[last - 1] }];
    const line = positions.map(blenderToView).map(([x, y, z]): Vec3 => [x, y + lift, z]);
    return (
      <>
        {ends.map(({ end, next }, endIndex) =>
          renderShapeModel(endShape(enemy, endIndex), blenderToView(end), index, endIndex, endFacing(enemy, end, next, endIndex), endIndex === 0 ? 1 : FAR_END_OPACITY))}
        <Line points={line} color={pathColour(index, colour)} lineWidth={2} />
        {index === selected && renderPathHandles(positions, index, WALKER_SIZES[enemy], colour)}
      </>
    );
  };

  const renderEnemy = (object: LevelObject, index: number) => {
    if (isPathEnemy(object.enemy)) {
      return renderPathWalker(object, index);
    }
    if (isSpotEnemy(object.enemy)) {
      return renderAtSpot(object, index, object.enemy);
    }
    if (object.enemy === "fish") {
      return renderFish(object, index);
    }
    if (object.enemy === "bat") {
      return renderBat(object, index);
    }
    if (object.enemy === "leader_bats") {
      return renderLeaderBats(object, index);
    }
    return renderLabAssistant(object, index); // the last enemy left
  };

  // a floating leaf: at its spot, where it drifts from, facing the way it drifts,
  // with the line of its drift, and faded where it turns back
  const renderLeaf = (object: LevelObject, index: number) => {
    const nodes = pathPositions(object, turn, scale); // its drift, or its own path
    const last = nodes.length - 1;
    const colour = OBSTACLE_COLOURS.leaf;
    return (
      <>
        {renderShapeModel(OBSTACLE_SHAPES.leaf, blenderToView(nodes[0]), index, 0, facingFrom(nodes[0], nodes[1], turn))}
        {renderShapeModel(OBSTACLE_SHAPES.leaf, blenderToView(nodes[last]), index, 1, facingFrom(nodes[last - 1], nodes[last], turn), FAR_END_OPACITY)}
        <Line points={nodes.map(blenderToView)} color={pathColour(index, colour)} lineWidth={2} />
        {index === selected && renderPathHandles(nodes, index, LEAF_SIZE, colour)}
      </>
    );
  };

  // a rolling stone on its track, where it rolls back and forth
  const renderRollingStone = (object: LevelObject, index: number) => (
    <>
      {renderStone(object, index)}
      {renderStoneTrack(object)}
    </>
  );

  // a mossy slide as its plank, sloping from its top end (at, raised) across the
  // map and down to its bottom end, as long as the great gate's long or short one
  const renderMossySlide = (object: LevelObject, index: number) => {
    const [x, y, z] = object.at;
    const top = blenderToView([x, y, z + object.raise]);
    const bottom = blenderToView(mossySlideEnd(object.at, object.raise, turn, scale, object.long === true, object.reverse === true));
    const centre = top.map((value, axis) => (value + bottom[axis]) / 2) as Vec3;
    const [dx, dy, dz] = bottom.map((value, axis) => value - top[axis]);
    const flat = Math.hypot(dx, dz);
    const colour = OBSTACLE_COLOURS.mossy_slide;
    return (
      <mesh position={centre} rotation={[0, Math.atan2(-dz, dx), Math.atan2(dy, flat), "YZX"]}>
        <boxGeometry args={[Math.hypot(flat, dy), PLANK_THICKNESS / scale, PLANK_WIDTH / scale]} />
        <meshLambertMaterial color={colour} />
        <Edges color={edgeColour(index, colour)} />
      </mesh>
    );
  };

  // a leaf with its drift, a rolling stone on its track, a mossy slide as its plank, and the rest at their
  // spots (a lily pad where it sinks from, a wooden peg opened out)
  const renderObstacle = (object: LevelObject, index: number) => {
    if (object.obstacle === "leaf") {
      return renderLeaf(object, index);
    }
    if (object.obstacle === "rolling_stone") {
      return renderRollingStone(object, index);
    }
    if (object.obstacle === "mossy_slide") {
      return renderMossySlide(object, index);
    }
    return renderShapeModel(OBSTACLE_SHAPES[object.obstacle!], base(object), index);
  };

  const renderShape = (object: LevelObject, index: number) => {
    switch (object.kind) {
      case "spawn":
        return renderSpawn(object, index);
      case "end":
        return renderEnd(object, index);
      case "box":
        return renderBoxStack(object, index);
      case "enemy":
        return renderEnemy(object, index);
      case "obstacle":
        return renderObstacle(object, index);
    }
  };

  const renderMarker = (object: LevelObject, index: number) => (
    <group key={index} onPointerDown={grab(index)} onClick={stopClick}>
      {renderShape(object, index)}
    </group>
  );

  return <>{objects.map(renderMarker)}</>;
}
