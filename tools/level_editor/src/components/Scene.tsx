import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Lights() {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} />
    </>
  );
}

// the 3d view: lit, orbited with the mouse
export default function Scene({ children }: { children: ReactNode }) {
  return (
    <Canvas camera={{ fov: 60, near: 0.05, far: 2000 }}>
      <color attach="background" args={["#2b2d31"]} />
      <Lights />
      {children}
      <OrbitControls makeDefault />
    </Canvas>
  );
}
