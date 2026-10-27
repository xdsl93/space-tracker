import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { UserLocation } from '../../types/station';
import { latLonToVector3 } from './earthUtils';

interface UserMarker3DProps {
  userLocation: UserLocation;
  earthRadius: number;
}

export const UserMarker3D: React.FC<UserMarker3DProps> = ({ userLocation, earthRadius }) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const surfacePos = useMemo(
    () => latLonToVector3(userLocation.lat, userLocation.lon, earthRadius * 1.003),
    [userLocation.lat, userLocation.lon, earthRadius]
  );

  const pinTopPos = useMemo(
    () => latLonToVector3(userLocation.lat, userLocation.lon, earthRadius * 1.045),
    [userLocation.lat, userLocation.lon, earthRadius]
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(surfacePos);
      groupRef.current.lookAt(0, 0, 0);
    }
    if (pulseRef.current) {
      const t = (clock.getElapsedTime() * 1.4) % 1;
      const s = 1 + t * 2.8;
      pulseRef.current.scale.set(s, s, s);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.85;
    }
  });

  return (
    <group>
      {/* Stem from surface to beacon head */}
      <Line points={[surfacePos, pinTopPos]} color="#10b981" lineWidth={2} />

      {/* Surface Radar Ring & Exact Ground Location Dot */}
      <group ref={groupRef}>
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.014, 0.024, 24]} />
          <meshBasicMaterial
            color="#10b981"
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh>
          <circleGeometry args={[0.013, 18]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Exact Surface Contact Sphere + Compact Off-Centered Label */}
      <mesh position={surfacePos}>
        <sphereGeometry args={[0.014, 16, 16]} />
        <meshBasicMaterial color="#34d399" />
        <Html distanceFactor={5} position={[0, 0, 0]} zIndexRange={[5, 0]}>
          <div className="translate-x-3 -translate-y-5 px-1.5 py-[1px] rounded bg-emerald-950/85 border border-emerald-400/60 text-emerald-200 text-[9px] font-mono font-semibold whitespace-nowrap shadow-md pointer-events-none flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
            <span>TU ({userLocation.lat.toFixed(1)}°, {userLocation.lon.toFixed(1)}°)</span>
          </div>
        </Html>
      </mesh>

      {/* Glowing 3D Pin Head */}
      <mesh position={pinTopPos}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.9}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};
