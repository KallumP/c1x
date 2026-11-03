import type { ElementRef, ReactNode, RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export type Orbit = ElementRef<typeof OrbitControls>;

// the 3d view: lit, orbited with the mouse. orbitRef lets the editor stop the
// camera while an object is dragged
export default function Scene({ orbitRef, children }: { orbitRef: RefObject<Orbit>; children: ReactNode }) {
  const renderLights = () => (
    <>
      <hemisphereLight args={["#ffffff", "#8a8a8a", 2.2]} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
    </>
  );

  return (
    <Canvas camera={{ fov: 60, near: 0.05, far: 2000 }}>
      <color attach="background" args={["#2b2d31"]} />
      {renderLights()}
      {children}
      <OrbitControls ref={orbitRef} makeDefault />
    </Canvas>
  );
}
