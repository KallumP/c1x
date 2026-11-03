import type * as THREE from "three";
import { useFramedCamera } from "../hooks/useFramedCamera";

export default function LevelMesh({ group }: { group: THREE.Group }) {
  useFramedCamera(group);
  return <primitive object={group} />;
}
