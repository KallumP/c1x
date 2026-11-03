// a level's objects, each drawn where the game puts it, sized by the level's scale
import { Edges } from "@react-three/drei";
import { blenderToView, boxSize, stackCentres } from "../coords";
import { boxStyle, END_COLOUR, SPAWN_COLOUR, type BoxStyle } from "../objectStyles";
import type { LevelObject, Vec3 } from "../objects";

const CRASH_UNITS = 665; // crash's height in game units (MAP_SCALE's comment in tools/nslevel.py)
const PAD_UNITS = 400;   // the warp pad's radius, about
const BOX_EDGE_COLOUR = "#000000";

// where an object's base is in the viewport, raised as it is in the game
function base(object: LevelObject): Vec3 {
  const [x, y, z] = object.at;
  return blenderToView([x, y, z + object.raise]);
}

export default function ObjectMarkers({ objects, scale }: { objects: LevelObject[]; scale: number }) {
  const renderBox = (centre: Vec3, style: BoxStyle, key: number) => {
    const size = boxSize(scale) * 0.98;
    return (
      <mesh key={key} position={blenderToView(centre)}>
        <boxGeometry args={[size, size, size]} />
        <meshLambertMaterial color={style.colour} transparent={style.wireframe} opacity={style.wireframe ? 0.15 : 1} />
        <Edges color={BOX_EDGE_COLOUR} lineWidth={style.wireframe ? 2 : 1.5} />
      </mesh>
    );
  };

  const renderBoxStack = (object: LevelObject, key: number) => {
    const style = boxStyle(object.box!);
    const centres = stackCentres(object.at, object.raise, object.stack, scale);
    return (
      <group key={key}>
        {centres.map((centre, boxIndex) => renderBox(centre, style, boxIndex))}
      </group>
    );
  };

  const renderSpawn = (object: LevelObject, key: number) => {
    const height = CRASH_UNITS / scale;
    const [x, y, z] = base(object);
    return (
      <mesh key={key} position={[x, y + height / 2, z]}>
        <capsuleGeometry args={[height / 5, height * 0.6, 4, 12]} />
        <meshLambertMaterial color={SPAWN_COLOUR} />
        <Edges color={SPAWN_COLOUR} />
      </mesh>
    );
  };

  const renderEnd = (object: LevelObject, key: number) => {
    const radius = PAD_UNITS / scale;
    const [x, y, z] = base(object);
    return (
      <mesh key={key} position={[x, y + radius / 20, z]}>
        <cylinderGeometry args={[radius, radius, radius / 10, 24]} />
        <meshLambertMaterial color={END_COLOUR} />
        <Edges color={END_COLOUR} />
      </mesh>
    );
  };

  const renderMarker = (object: LevelObject, index: number) => {
    switch (object.kind) {
      case "spawn":
        return renderSpawn(object, index);
      case "end":
        return renderEnd(object, index);
      case "box":
        return renderBoxStack(object, index);
    }
  };

  return <>{objects.map(renderMarker)}</>;
}
