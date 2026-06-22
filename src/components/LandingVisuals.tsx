import React, { useCallback, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import type { Mesh } from 'three';

const useCanvasReveal = () => {
  const [ready, setReady] = useState(false);

  const reveal = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
  }, []);

  return { ready, reveal };
};

const WireframeGlobe = () => {
  const meshRef = useRef<Mesh>(null);
  const innerMeshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    if (meshRef.current) {
      meshRef.current.rotation.y = elapsed * 0.15;
      meshRef.current.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
    }

    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.y = -elapsed * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.5, 2]} />
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh ref={innerMeshRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color="#c084fc" wireframe transparent opacity={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#d8b4fe" transparent opacity={0.8} />
        <pointLight color="#a855f7" intensity={2} distance={10} />
      </mesh>
    </Float>
  );
};

export const LandingBackground3D = () => {
  const { ready, reveal } = useCanvasReveal();

  return (
    <div
      className={`h-full w-full transition-opacity duration-1000 ease-out motion-reduce:transition-none ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Canvas camera={{ position: [0, 0, 1] }} onCreated={reveal}>
        <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
      </Canvas>
    </div>
  );
};

export const LandingHero3D = () => {
  const { ready, reveal } = useCanvasReveal();

  return (
    <div
      className={`h-full w-full transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
        ready ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} onCreated={reveal}>
        <ambientLight intensity={0.5} />
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
        <WireframeGlobe />
      </Canvas>
    </div>
  );
};
