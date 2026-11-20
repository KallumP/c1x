import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { useFramedCamera } from "../hooks/useFramedCamera";

// the handlers go on a group around the map, as a primitive keeps its first ones
export default function LevelMesh({ group, onClick, onPointerMove, onPointerOut }: {
  group: THREE.Group;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  useFramedCamera(group);
  return (
    <group onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
      <primitive object={group} />
    </group>
  );
}
