import { useEffect, useState } from "react";
import type * as THREE from "three";
import type { LevelInfo } from "../api";
import { loadLevel } from "../three/loadLevel";

// a level's mesh, once it's loaded (null until then, with no level, or if it can't be)
export function useLevelGroup(level: LevelInfo | null, onError: (message: string) => void) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  useEffect(() => {
    setGroup(null);
    if (!level) {
      return;
    }
    let isLatestLoad = true; // false once the level changes, so a late load is dropped
    const loadGroup = async () => {
      try {
        const loadedGroup = await loadLevel(level);
        if (isLatestLoad) {
          setGroup(loadedGroup);
        }
      } catch (error) {
        if (isLatestLoad) {
          onError(error instanceof Error ? error.message : String(error));
        }
      }
    };
    loadGroup();
    return () => {
      isLatestLoad = false;
    };
  }, [level, onError]);
  return group;
}
