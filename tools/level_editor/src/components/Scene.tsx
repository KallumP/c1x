import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// the 3d view: lit, orbited with the mouse
export default function Scene({ children }: { children: ReactNode }) {
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
      <OrbitControls makeDefault />
    </Canvas>
  );
}
