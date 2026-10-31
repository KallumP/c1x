// a level's objects, each drawn where the game puts it, sized by the level's scale
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { blenderToView, boxSize, stackCentres } from "../coords";
import { boxStyle, END_COLOUR, SELECTED_COLOUR, SPAWN_COLOUR, WARNING_COLOUR, type BoxStyle } from "../objectStyles";
import type { LevelObject, Vec3 } from "../objects";

const CRASH_UNITS = 665; // crash's height in game units (MAP_SCALE's comment in tools/nslevel.py)
const PAD_UNITS = 400;   // the warp pad's radius, about
const BOX_EDGE_COLOUR = "#000000";

// where an object's base is in the viewport, raised as it is in the game
function base(object: LevelObject): Vec3 {
  const [x, y, z] = object.at;
  return blenderToView([x, y, z + object.raise]);
}

export default function ObjectMarkers({ objects, scale, selected, warnings, onSelect }: {
  objects: LevelObject[];
  scale: number;
  selected: number | null;
  warnings: Set<number>; // the boxes in a wall or another box
  onSelect: (index: number) => void;
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

  const renderSpawn = (object: LevelObject, index: number) => {
    const height = CRASH_UNITS / scale;
    const [x, y, z] = base(object);
    return (
      <mesh position={[x, y + height / 2, z]}>
        <capsuleGeometry args={[height / 5, height * 0.6, 4, 12]} />
        <meshLambertMaterial color={SPAWN_COLOUR} />
        <Edges color={edgeColour(index, SPAWN_COLOUR)} />
      </mesh>
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

  const renderShape = (object: LevelObject, index: number) => {
    switch (object.kind) {
      case "spawn":
        return renderSpawn(object, index);
      case "end":
        return renderEnd(object, index);
      case "box":
        return renderBoxStack(object, index);
    }
  };

  const renderMarker = (object: LevelObject, index: number) => (
    <group key={index} onPointerDown={grab(index)} onClick={stopClick}>
      {renderShape(object, index)}
    </group>
  );

  return <>{objects.map(renderMarker)}</>;
}
