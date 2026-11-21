import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Raycaster, Vector2, type Group } from "three";
import { alongAxis, AXES, type Axis } from "../axisDrag";
import { blenderToView } from "../coords";
import type { Vec3 } from "../objects";
import { isLeftPress } from "../three/clicks";

const SCREEN_SIZE = 0.12;  // the arrows' length, as a share of their distance from the camera, so they stay one size on screen
const SHAFT_RADIUS = 0.025; // as shares of the arrows' length
const HEAD_LENGTH = 0.25;
const HEAD_RADIUS = 0.07;
const GRAB_RADIUS = 0.09;   // the invisible rod round each arrow that's pressed on, wider than it so it's easy to grab
const HOVER_COLOUR = "#ffd60a";
const ON_TOP = 10;          // drawn after the level and objects, so they show through them

// the turn (x, y, z in radians) taking an arrow from pointing up the viewport
// (as three's cylinders and cones do) to pointing along an axis
const TURNS: Record<Axis, Vec3> = {
  x: [0, 0, -Math.PI / 2],
  y: [-Math.PI / 2, 0, 0], // blender's y is the viewport's -z
  up: [0, 0, 0],
};

export interface AxisDragHandlers {
  onGrab: () => void;                         // an arrow is pressed on
  onMove: (axis: Axis, metres: number) => void; // the pointer has moved, metres along axis from where it was pressed
  onRelease: () => void;                      // it's let go of, anywhere
}

// an arrow being dragged: its axis's line in the viewport, through where the
// object was when it was pressed, and how far along it the pointer was then
interface Dragging {
  axis: Axis;
  origin: Vec3;
  way: Vec3;
  start: number;
}

const toVec3 = (vector: { toArray: () => number[] }) => vector.toArray() as Vec3;

// the selected object's axis arrows: x, y and up (blender), at at (blender),
// one size on screen however far the camera is. pressing on one and moving
// the pointer moves the object along it, however the pointer strays off it
export default function AxisHandles({ at, onGrab, onMove, onRelease }: { at: Vec3 } & AxisDragHandlers) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState<Axis | null>(null);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const handlers = useRef({ onMove, onRelease }); // the latest, so the drag's listeners needn't change with them
  handlers.current = { onMove, onRelease };

  useEffect(() => {
    if (dragging === null) {
      return;
    }
    // the pointer's ray through the viewport, from the camera
    const move = (event: PointerEvent) => {
      const bounds = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(new Vector2(x, y), camera);
      const along = alongAxis(dragging.origin, dragging.way, toVec3(raycaster.ray.origin), toVec3(raycaster.ray.direction));
      if (along !== null) {
        handlers.current.onMove(dragging.axis, along - dragging.start);
      }
    };
    const stop = () => {
      setDragging(null);
      handlers.current.onRelease();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [dragging, camera, gl, raycaster]);

  // pressing on an arrow grabs it; the press stops here, so it doesn't reach the object or level behind
  const grab = (axis: Axis, direction: Vec3) => (event: ThreeEvent<PointerEvent>) => {
    if (!isLeftPress(event)) {
      return;
    }
    event.stopPropagation();
    const origin = blenderToView(at);
    const way = blenderToView(direction);
    const start = alongAxis(origin, way, toVec3(event.ray.origin), toVec3(event.ray.direction));
    if (start === null) {
      return;
    }
    onGrab();
    setDragging({ axis, origin, way, start });
  };
  const stopClick = (event: ThreeEvent<MouseEvent>) => event.stopPropagation();

  useFrame(({ camera }) => {
    if (group.current) {
      group.current.scale.setScalar(group.current.position.distanceTo(camera.position) * SCREEN_SIZE);
    }
  });

  const renderArrow = (axis: Axis, direction: Vec3, colour: string) => {
    const isLit = dragging ? dragging.axis === axis : hovered === axis;
    const shown = isLit ? HOVER_COLOUR : colour;
    const shaft = 1 - HEAD_LENGTH;
    return (
      <group key={axis} rotation={TURNS[axis]}>
        <mesh position={[0, shaft / 2, 0]} renderOrder={ON_TOP}>
          <cylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS, shaft, 12]} />
          <meshBasicMaterial color={shown} depthTest={false} transparent />
        </mesh>
        <mesh position={[0, shaft + HEAD_LENGTH / 2, 0]} renderOrder={ON_TOP}>
          <coneGeometry args={[HEAD_RADIUS, HEAD_LENGTH, 16]} />
          <meshBasicMaterial color={shown} depthTest={false} transparent />
        </mesh>
        <mesh
          position={[0, 0.5, 0]}
          onPointerDown={grab(axis, direction)}
          onClick={stopClick}
          onPointerOver={() => setHovered(axis)}
          onPointerOut={() => setHovered((current) => (current === axis ? null : current))}
        >
          <cylinderGeometry args={[GRAB_RADIUS, GRAB_RADIUS, 1, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={group} position={blenderToView(at)}>
      {AXES.map(({ axis, direction, colour }) => renderArrow(axis, direction, colour))}
    </group>
  );
}
