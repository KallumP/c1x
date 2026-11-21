import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { AXES, type Axis } from "../axisDrag";
import { blenderToView } from "../coords";
import type { Vec3 } from "../objects";

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

// the selected object's axis arrows: x, y and up (blender), at at (blender),
// one size on screen however far the camera is
export default function AxisHandles({ at }: { at: Vec3 }) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState<Axis | null>(null);

  useFrame(({ camera }) => {
    if (group.current) {
      group.current.scale.setScalar(group.current.position.distanceTo(camera.position) * SCREEN_SIZE);
    }
  });

  const renderArrow = (axis: Axis, colour: string) => {
    const shown = hovered === axis ? HOVER_COLOUR : colour;
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
      {AXES.map(({ axis, colour }) => renderArrow(axis, colour))}
    </group>
  );
}
