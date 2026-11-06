// a level's objects, each drawn where the game puts it, sized by the level's scale
import { Edges, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { blenderToView, boxSize, cameraFacing, enemyTurn, facingFrom, stackCentres, stonePath, stoneRolling, STONE_TRACK } from "../coords";
import { boxStyle, END_COLOUR, ENEMY_COLOURS, SELECTED_COLOUR, SPAWN_COLOUR, WARNING_COLOUR, type BoxStyle } from "../objectStyles";
import { ENEMY_SHAPES, partGeometry, type ShapePart } from "../enemyShapes";
import { pathPositions } from "../enemyPaths";
import type { LevelObject, Vec3 } from "../objects";

const CRASH_UNITS = 665; // crash's height in game units (MAP_SCALE's comment in builder/makeMap.ts)
const PAD_UNITS = 400;   // the warp pad's radius, about
const STONE_THICKNESS = 0.35; // of the rolling stone's radius
const TRACK_OPACITY = 0.25;   // of the outline of a rolling stone's track
const BOX_EDGE_COLOUR = "#000000";
const HANDLE_SIZE = 0.15;   // a path node's handle's radius, of a box's size
const SELECTED_GLOW = 0.35; // how much brighter the selected enemy's model is

// where an object's base is in the viewport, raised as it is in the game
function base(object: LevelObject): Vec3 {
  const [x, y, z] = object.at;
  return blenderToView([x, y, z + object.raise]);
}

export default function ObjectMarkers({ objects, scale, turn, selected, selectedNode, warnings, onSelect, onSelectNode }: {
  objects: LevelObject[];
  scale: number;
  turn: number; // the level's, which sets the way the spawn's arrow points
  selected: number | null;
  selectedNode: number | null; // a node of the selected crab's or turtle's path
  warnings: Set<number>; // the boxes in a wall or another box
  onSelect: (index: number) => void;
  onSelectNode: (index: number, node: number) => void;
}) {
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
    return (
      <group position={base(object)}>
        <mesh position={[0, height / 2, 0]}>
          <capsuleGeometry args={[height / 5, height * 0.6, 4, 12]} />
          <meshLambertMaterial color={SPAWN_COLOUR} />
          <Edges color={edgeColour(index, SPAWN_COLOUR)} />
        </mesh>
        {renderSpawnArrow(height)}
      </group>
    );
  };

  const renderEnd = (object: LevelObject, index: number) => {
    const radius = PAD_UNITS / scale;
    const [x, y, z] = base(object);
    return (
      <mesh position={[x, y + radius / 20, z]}>
        <cylinderGeometry args={[radius, radius, radius / 10, 24]} />
        <meshLambertMaterial color={END_COLOUR} />
        <Edges color={edgeColour(index, END_COLOUR)} />
      </mesh>
    );
  };

  const renderShapePart = (part: ShapePart, partIndex: number, glow: number) => (
    <mesh key={partIndex} geometry={partGeometry(part)}>
      <meshLambertMaterial color={part.colour} emissive={SELECTED_COLOUR} emissiveIntensity={glow} />
    </mesh>
  );

  // an enemy's model standing at at (in the viewport), facing the player, sized by the level's
  // scale; the selected one glows
  const renderEnemyModel = (parts: ShapePart[], at: Vec3, index: number, key?: number, facing = enemyTurn(turn)) => {
    const glow = index === selected ? SELECTED_GLOW : 0;
    return (
      <group key={key} position={at} rotation={[0, facing, 0]} scale={1 / scale}>
        {parts.map((part, partIndex) => renderShapePart(part, partIndex, glow))}
      </group>
    );
  };

  const renderPlant = (object: LevelObject, index: number) =>
    renderEnemyModel(ENEMY_SHAPES.plant, base(object), index);

  // the rolling stone: a wheel on its track's floor, a box's height over its spot, turned to roll across the map as the game rolls it
  const renderStone = (object: LevelObject, index: number) => {
    const radius = STONE_TRACK.radius / scale;
    const [x, y, z] = base(object);
    const [rollX, , rollZ] = blenderToView(stoneRolling(turn));
    return (
      <mesh position={[x, y + STONE_TRACK.lift / scale + radius, z]} rotation={[0, Math.atan2(rollX, rollZ), Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, radius * STONE_THICKNESS, 20]} />
        <meshLambertMaterial color={ENEMY_COLOURS.rolling_stone} />
        <Edges color={edgeColour(index, ENEMY_COLOURS.rolling_stone)} />
      </mesh>
    );
  };

  // the track a rolling stone comes with: its outline on the floor, and the line its middle rolls along
  const renderStoneTrack = (object: LevelObject) => {
    const [rollX, , rollZ] = blenderToView(stoneRolling(turn));
    const [x, y, z] = base(object);
    const lift = boxSize(scale) / 50; // above the floor, so it isn't hidden in it
    const path = stonePath(object.at, object.raise, turn, scale).map(blenderToView);
    const colour = ENEMY_COLOURS.rolling_stone;
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
  const renderPathHandle = (position: Vec3, index: number, nodeIndex: number, colour: string) => {
    const radius = boxSize(scale) * HANDLE_SIZE;
    const [x, y, z] = blenderToView(position);
    return (
      <mesh key={`node ${nodeIndex}`} position={[x, y + radius, z]} onPointerDown={grabNode(index, nodeIndex)}>
        <sphereGeometry args={[radius, 12, 8]} />
        <meshBasicMaterial color={nodeIndex === selectedNode ? SELECTED_COLOUR : colour} />
      </mesh>
    );
  };

  // which way an enemy at an end of its path faces: a turtle back into its path
  // (it turns to face the way it walks, seen in the game); a crab the player
  const endFacing = (enemy: "crab" | "turtle", end: Vec3, next: Vec3) =>
    enemy === "turtle" ? facingFrom(end, next, turn) : enemyTurn(turn);

  // a crab or turtle: at the first and last nodes of the path it walks back and
  // forth along, where it turns round, with the line through its nodes, and a
  // handle on each node while it's selected
  const renderPathWalker = (object: LevelObject, index: number) => {
    const enemy = object.enemy as "crab" | "turtle";
    const colour = ENEMY_COLOURS[enemy];
    const lift = boxSize(scale) / 50; // above the floor, so it isn't hidden in it
    const positions = pathPositions(object, turn, scale);
    const last = positions.length - 1;
    const ends = [{ end: positions[0], next: positions[1] }, { end: positions[last], next: positions[last - 1] }];
    const line = positions.map(blenderToView).map(([x, y, z]): Vec3 => [x, y + lift, z]);
    return (
      <>
        {ends.map(({ end, next }, endIndex) =>
          renderEnemyModel(ENEMY_SHAPES[enemy], blenderToView(end), index, endIndex, endFacing(enemy, end, next)))}
        <Line points={line} color={colour} lineWidth={2} />
        {index === selected && positions.map((position, nodeIndex) => renderPathHandle(position, index, nodeIndex, colour))}
      </>
    );
  };

  const renderEnemy = (object: LevelObject, index: number) => {
    if (object.enemy === "crab" || object.enemy === "turtle") {
      return renderPathWalker(object, index);
    }
    if (object.enemy !== "rolling_stone") {
      return renderPlant(object, index);
    }
    return (
      <>
        {renderStone(object, index)}
        {renderStoneTrack(object)}
      </>
    );
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
    }
  };

  const renderMarker = (object: LevelObject, index: number) => (
    <group key={index} onPointerDown={grab(index)} onClick={stopClick}>
      {renderShape(object, index)}
    </group>
  );

  return <>{objects.map(renderMarker)}</>;
}
