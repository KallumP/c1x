import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { View } from "../spawnView";

interface Controls { target: THREE.Vector3; update(): void }

// where to look at a level from: behind the start of its route, which runs along -z
// (blender's +y), looking down on it
function startView(group: THREE.Group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const across = Math.max(size.x, 1);
  const target = new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, box.min.y, box.max.z - Math.min(size.z, across) / 3);
  const position = new THREE.Vector3(target.x, target.y + across * 0.6, box.max.z + across * 0.5);
  return { target, position };
}

// points the camera (and the orbit controls) at a level once, when it's loaded
// (isReady: its objects and level.cfg too): at its spawn (spawn, its view), or
// over the start of its map without one. moving the spawn after doesn't move it
export function useFramedCamera(group: THREE.Group | null, spawn: View | null, isReady: boolean) {
  const { camera, controls } = useThree();
  const framed = useRef<THREE.Group | null>(null); // the map the camera was last pointed at
  useEffect(() => {
    if (!group || !isReady || framed.current === group) return;
    framed.current = group;
    const { target, position } = spawn
      ? { target: new THREE.Vector3(...spawn.target), position: new THREE.Vector3(...spawn.position) }
      : startView(group);
    camera.position.copy(position);
    const orbit = controls as unknown as Controls | null;
    if (orbit) {
      orbit.target.copy(target);
      orbit.update();
    } else {
      camera.lookAt(target);
    }
  }, [group, spawn, isReady, camera, controls]);
}
