import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { useFramedCamera } from "../hooks/useFramedCamera";
import type { View } from "../spawnView";

// the handlers go on a group around the map, as a primitive keeps its first ones
// the camera starts at spawn (its view, or over the map without one) once isReady
export default function LevelMesh({ group, spawn, isReady, onClick, onPointerMove }: {
  group: THREE.Group;
  spawn: View | null;
  isReady: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  useFramedCamera(group, spawn, isReady);
  return (
    <group onClick={onClick} onPointerMove={onPointerMove}>
      <primitive object={group} />
    </group>
  );
}
