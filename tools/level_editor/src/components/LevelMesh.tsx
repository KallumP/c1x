import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { useFramedCamera } from "../hooks/useFramedCamera";

// the handlers go on a group around the map, as a primitive keeps its first ones
export default function LevelMesh({ group, onClick, onPointerMove }: {
  group: THREE.Group;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  useFramedCamera(group);
  return (
    <group onClick={onClick} onPointerMove={onPointerMove}>
      <primitive object={group} />
    </group>
  );
}
