import type { ThreeEvent } from "@react-three/fiber";
import type * as THREE from "three";
import { useFramedCamera } from "../hooks/useFramedCamera";

export default function LevelMesh({ group, onClick }: {
  group: THREE.Group;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  useFramedCamera(group);
  return <primitive object={group} onClick={onClick} />;
}
