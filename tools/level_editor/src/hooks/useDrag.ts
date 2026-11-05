import { useEffect, useRef, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Orbit } from "../components/Scene";
import type { Vec3 } from "../objects";
import { clickedFloor } from "../three/clicks";

// target: what's dragged (an object, or a waypoint of one)
export interface DragHandlers<Target> {
  grab: (target: Target) => void;           // pressed on it
  begin: (target: Target) => void;          // it starts moving
  move: (target: Target, at: Vec3) => void; // it's moved to at
}

// dragging something across the floor: press on it, move over the level, let
// go anywhere. the camera stays still while dragging
export function useDrag<Target>(orbitRef: RefObject<Orbit>, grid: number, handlers: DragHandlers<Target>) {
  const [dragging, setDragging] = useState<Target | null>(null);
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
  const start = (target: Target) => {
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
      handlers.begin(dragging);
      hasMoved.current = true;
    }
    handlers.move(dragging, at);
  };

  return { start, moveOverLevel };
}
