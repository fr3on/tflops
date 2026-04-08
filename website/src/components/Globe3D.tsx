"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Sphere, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function EarthArtifact({ stats }: { stats: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // High-contrast topographic texture for the academic look
  const texture = useLoader(THREE.TextureLoader, "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg");

  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
  });

  const markers = useMemo(() => {
    return (stats?.countries || []).map((c: any, i: number) => {
      // Standard mapping would require lat/long. 
      // For this visualization, we distribute points on the surface based on the country pool.
      const phi = Math.acos(-1 + (2 * i) / stats.countries.length);
      const theta = Math.sqrt(stats.countries.length * Math.PI) * phi;
      return new THREE.Vector3().setFromSphericalCoords(2.02, phi, theta);
    });
  }, [stats]);

  return (
    <>
      {/* Topographic Artifact Base with real terrestrial data map */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <meshStandardMaterial 
          map={texture}
          color="#fcf9f2" 
          metalness={0.0} 
          roughness={1.0}
        />
        {/* Subtle technical graticule overlay */}
        <Sphere args={[2.01, 32, 24]}>
            <meshBasicMaterial color="#1a1a1a" wireframe transparent opacity={0.08} />
        </Sphere>
      </Sphere>

      {/* Atmospheric depth */}
      <Sphere args={[2.08, 32, 32]}>
        <meshBasicMaterial color="#3d7a5a" transparent opacity={0.03} side={THREE.BackSide} />
      </Sphere>

      {markers.map((pos: THREE.Vector3, i: number) => (
        <group key={i} position={pos}>
          <Sphere args={[0.015, 8, 8]}>
            <meshBasicMaterial color="#3d7a5a" />
          </Sphere>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.16, 8]} />
            <meshBasicMaterial color="#3d7a5a" transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function Globe3D({ stats }: { stats: any }) {
  return (
    <div className="w-full h-full min-h-[500px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 35 }}>
        <pointLight position={[10, 10, 10]} intensity={2.0} color="#fff" />
        <ambientLight intensity={0.9} />
        <EarthArtifact stats={stats} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.15} />
      </Canvas>
    </div>
  );
}
