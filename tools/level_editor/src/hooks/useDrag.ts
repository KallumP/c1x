import { useEffect, useRef, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Orbit } from "../components/Scene";
import type { Vec3 } from "../objects";
import { clickedFloor } from "../three/clicks";

export interface DragHandlers {
  grab: (index: number) => void;           // pressed on an object
  begin: (index: number) => void;          // it starts moving
  move: (index: number, at: Vec3) => void; // it's moved to at
}

// dragging an object across the floor: press on the object, move over the
// level, let go anywhere. the camera stays still while dragging
export function useDrag(orbitRef: RefObject<Orbit>, grid: number, handlers: DragHandlers) {
  const [dragging, setDragging] = useState<number | null>(null);
  const hasMoved = useRef(false); // whether this drag has moved the object yet, so begin runs once

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
    hasMoved.current = false;
    handlers.grab(index);
    setDragging(index);
  };

  const moveOverLevel = (event: ThreeEvent<PointerEvent>) => {
    if (dragging === null) {
      return;
    }
    const at = clickedFloor(event, grid);
    if (!at) {
      return;
    }
    if (!hasMoved.current) {
      handlers.begin(dragging);
      hasMoved.current = true;
    }
    handlers.move(dragging, at);
  };

  return { start, moveOverLevel };
}
