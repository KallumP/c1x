import { useEffect, useRef, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Orbit } from "../components/Scene";
import type { Vec3 } from "../objects";
import { clickedFloor } from "../three/clicks";

// what's dragged: an object, or a node of its path
export interface DragTarget {
  index: number;
  node: number | null;
}

export interface DragHandlers {
  grab: (target: DragTarget) => void;           // pressed on an object or a node
  begin: () => void;                            // it starts moving
  move: (target: DragTarget, at: Vec3) => void; // it's moved to at
}

// dragging an object, or a node of its path, across the floor: press on it,
// move over the level, let go anywhere. the camera stays still while dragging
export function useDrag(orbitRef: RefObject<Orbit>, grid: number, handlers: DragHandlers) {
  const [dragging, setDragging] = useState<DragTarget | null>(null);
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
  const start = (target: DragTarget) => {
    if (orbitRef.current) {
      orbitRef.current.enabled = false;
    }
    hasMoved.current = false;
    handlers.grab(target);
    setDragging(target);
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
      handlers.begin();
      hasMoved.current = true;
    }
    handlers.move(dragging, at);
  };

  return {
    start: (index: number) => start({ index, node: null }),
    startNode: (index: number, node: number) => start({ index, node }),
    moveOverLevel,
  };
}
