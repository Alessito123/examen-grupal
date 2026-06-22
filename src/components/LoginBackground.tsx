import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Componente de partículas flotantes
const ParticleField = ({ mousePos }: { mousePos: { x: number; y: number } }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generar posiciones aleatorias para las partículas
  const count = 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    // Rotación suave del campo de partículas
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.01;

    // Efecto parallax con el mouse
    const targetX = mousePos.x * 0.6;
    const targetY = mousePos.y * 0.6;
    pointsRef.current.position.x += (targetX - pointsRef.current.position.x) * 0.05;
    pointsRef.current.position.y += (targetY - pointsRef.current.position.y) * 0.05;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c084fc"
        size={0.06}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

// Objeto 3D Central (Torus Knot) que rota e interactúa
const CentralGeometry = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    // Rotar lentamente
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    
    // Cambiar color/brillo sutilmente
    if (meshRef.current.material) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      const hue = (state.clock.getElapsedTime() * 0.03) % 1;
      material.color.setHSL(hue, 0.7, 0.5);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2.5]}>
      <torusKnotGeometry args={[0.8, 0.25, 120, 16]} />
      <meshStandardMaterial roughness={0.1} metalness={0.9} />
    </mesh>
  );
};

const LoginBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const revealCanvas = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCanvasReady(true));
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-[#06060f] via-[#0d0722] to-[#040817] transition-all duration-1000">
      {/* Dynamic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-40" />

      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[110px]" />

      {!isMobile && (
        <div
          className={`absolute inset-0 transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
            canvasReady ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
          }`}
        >
          <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            className="h-full w-full"
            onCreated={revealCanvas}
          >
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={2.0} color="#a855f7" />
            <pointLight position={[-10, -10, -10]} intensity={1.5} color="#3b82f6" />
            <ParticleField mousePos={mousePos} />
            <CentralGeometry />
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default LoginBackground;
