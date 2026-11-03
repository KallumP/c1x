import { useEffect, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Orbit } from "../components/Scene";
import type { Vec3 } from "../objects";
import { clickedFloor } from "../three/clicks";

// dragging an object across the floor: start on the object, move over the
// level, let go anywhere. the camera stays still while dragging
export function useDrag(
  orbitRef: RefObject<Orbit>,
  grid: number,
  onStart: (index: number) => void,
  onMove: (index: number, at: Vec3) => void,
) {
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    if (dragging === null) {
      return;
    }
    const stop = () => {
      if (orbitRef.current) {
        orbitRef.current.enabled = true;
      }
      setDragging(null);
    };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, [dragging, orbitRef]);

  // the camera stops at once, before the orbit controls act on this press
  const start = (index: number) => {
    if (orbitRef.current) {
      orbitRef.current.enabled = false;
    }
    onStart(index);
    setDragging(index);
  };

  const moveOverLevel = (event: ThreeEvent<PointerEvent>) => {
    if (dragging === null) {
      return;
    }
    const at = clickedFloor(event, grid);
    if (at) {
      onMove(dragging, at);
    }
  };

  return { start, moveOverLevel };
}
