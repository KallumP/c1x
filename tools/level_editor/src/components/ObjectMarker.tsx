// an object in the level, drawn where the game puts it, sized by the level's scale
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { blenderToView, boxSize, stackCentres } from "../coords";
import { boxStyle, END_COLOUR, SELECTED_COLOUR, SPAWN_COLOUR, WARNING_COLOUR } from "../objectStyles";
import type { LevelObject, Vec3 } from "../objects";

const CRASH_UNITS = 665; // crash's height in game units (MAP_SCALE's comment in tools/nslevel.py)
const PAD_UNITS = 400;   // the warp pad's radius, about

export interface MarkerProps {
  object: LevelObject;
  scale: number;
  selected: boolean;
  warning: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}

// where an object's base is in the viewport, raised as it is in the game
function base(object: LevelObject): Vec3 {
  const [x, y, z] = object.at;
  return blenderToView([x, y, z + object.raise]);
}

function edgeColour(selected: boolean, warning: boolean, colour: string) {
  if (warning) return WARNING_COLOUR;
  return selected ? SELECTED_COLOUR : colour;
}

function Box({ centre, size, colour, wireframe, edges }: {
  centre: Vec3; size: number; colour: string; wireframe: boolean; edges: string;
}) {
  return (
    <mesh position={blenderToView(centre)}>
      <boxGeometry args={[size, size, size]} />
      <meshLambertMaterial color={colour} transparent={wireframe} opacity={wireframe ? 0.15 : 1} />
      <Edges color={edges} lineWidth={wireframe ? 2 : 1.5} />
    </mesh>
  );
}

function BoxStack({ object, scale, selected, warning, onPointerDown }: MarkerProps) {
  const style = boxStyle(object.box!);
  const size = boxSize(scale);
  const edges = edgeColour(selected, warning, selected || warning ? style.colour : "#000000");
  return (
    <group onPointerDown={onPointerDown}>
      {stackCentres(object.at, object.raise, object.stack, scale).map((centre, k) => (
        <Box key={k} centre={centre} size={size * 0.98} colour={style.colour} wireframe={style.wireframe} edges={edges} />
      ))}
    </group>
  );
}

function SpawnMarker({ object, scale, selected, warning, onPointerDown }: MarkerProps) {
  const height = CRASH_UNITS / scale;
  const [x, y, z] = base(object);
  return (
    <mesh position={[x, y + height / 2, z]} onPointerDown={onPointerDown}>
      <capsuleGeometry args={[height / 5, height * 0.6, 4, 12]} />
      <meshLambertMaterial color={SPAWN_COLOUR} />
      <Edges color={edgeColour(selected, warning, SPAWN_COLOUR)} />
    </mesh>
  );
}

function EndMarker({ object, scale, selected, warning, onPointerDown }: MarkerProps) {
  const radius = PAD_UNITS / scale;
  const [x, y, z] = base(object);
  return (
    <mesh position={[x, y + radius / 20, z]} onPointerDown={onPointerDown}>
      <cylinderGeometry args={[radius, radius, radius / 10, 24]} />
      <meshLambertMaterial color={END_COLOUR} />
      <Edges color={edgeColour(selected, warning, END_COLOUR)} />
    </mesh>
  );
}

export default function ObjectMarker(props: MarkerProps) {
  switch (props.object.kind) {
    case "spawn": return <SpawnMarker {...props} />;
    case "end": return <EndMarker {...props} />;
    case "box": return <BoxStack {...props} />;
  }
}
