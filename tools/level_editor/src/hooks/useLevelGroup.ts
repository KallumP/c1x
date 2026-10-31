import { useEffect, useState } from "react";
import type * as THREE from "three";
import type { LevelInfo } from "../api";
import { loadLevel } from "../three/loadLevel";

// a level's mesh, once it's loaded (null until then, or if it can't be)
export function useLevelGroup(level: LevelInfo, onError: (message: string) => void) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let current = true;
    setGroup(null);
    loadLevel(level).then(
      (g) => current && setGroup(g),
      (e) => current && onError(e instanceof Error ? e.message : String(e)),
    );
    return () => { current = false; };
  }, [level, onError]);
  return group;
}
