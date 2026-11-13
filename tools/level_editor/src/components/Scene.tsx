import type { ElementRef, ReactNode, RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MOUSE } from "three";

export type Orbit = ElementRef<typeof OrbitControls>;

// left-drag moves the camera sideways, right-drag turns it round, the wheel zooms
const CAMERA_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };

// the 3d view: lit, orbited with the mouse. orbitRef lets the editor stop the
// camera while an object is dragged, and onMiss is a click on nothing
export default function Scene({ orbitRef, onMiss, children }: {
  orbitRef: RefObject<Orbit>; onMiss: () => void; children: ReactNode;
}) {
  const clickNothing = (event: MouseEvent) => {
    if (event.type === "click") {
      onMiss();
    }
  };

  const renderLights = () => (
    <>
      <hemisphereLight args={["#ffffff", "#8a8a8a", 2.2]} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
    </>
  );

  return (
    <Canvas camera={{ fov: 60, near: 0.05, far: 2000 }} onPointerMissed={clickNothing}>
      <color attach="background" args={["#2b2d31"]} />
      {renderLights()}
      {children}
      <OrbitControls ref={orbitRef} makeDefault mouseButtons={CAMERA_BUTTONS} />
    </Canvas>
  );
}
