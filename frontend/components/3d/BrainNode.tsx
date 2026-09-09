'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleSwarm({ isHovered, isThinking }: { isHovered: boolean, isThinking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const speed = useRef({ y: 0.05, x: 0.02 });
  
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

  useFrame((state, delta) => {
    if (pointsRef.current) {
      // Speed up if the user hovers OR if the AI is actively fetching data
      const active = isHovered || isThinking;
      const targetY = active ? 1.0 : 0.05;
      const targetX = active ? 0.4 : 0.02;
      
      speed.current.y = THREE.MathUtils.lerp(speed.current.y, targetY, 0.05);
      speed.current.x = THREE.MathUtils.lerp(speed.current.x, targetX, 0.05);

      pointsRef.current.rotation.y += delta * speed.current.y;
      pointsRef.current.rotation.x -= delta * speed.current.x;
    }
  });

  const active = isHovered || isThinking;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPosition, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={active ? "#00ffff" : "#0055ff"}
        transparent
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
}

export default function BrainNode({ isThinking = false }: { isThinking?: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="w-full h-full absolute inset-0 z-10 cursor-crosshair transition-colors duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <ParticleSwarm isHovered={isHovered} isThinking={isThinking} />
      </Canvas>
    </div>
  );
}
