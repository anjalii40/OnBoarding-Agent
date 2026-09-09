'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleSwarm({ isThinking = false }: { isThinking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  
  // Generate 2,000 random points in a sphere to represent the codebase "nodes"
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for(let i = 0; i < 2000; i++) {
      const r = 3.5 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  // Animate the sphere rotating. Spin much faster if the AI is "thinking"
  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (isThinking ? 1.5 : 0.05);
      pointsRef.current.rotation.x -= delta * (isThinking ? 0.5 : 0.02);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={isThinking ? "#00ffff" : "#0055ff"}
        transparent
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
}

export default function BrainNode({ isThinking = false }: { isThinking?: boolean }) {
  return (
    <div className="w-full h-full absolute inset-0 z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <ParticleSwarm isThinking={isThinking} />
      </Canvas>
    </div>
  );
}
