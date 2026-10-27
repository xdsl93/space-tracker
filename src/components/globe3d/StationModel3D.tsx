import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { StationTelemetry } from '../../types/station';
import { latLonToVector3 } from './earthUtils';

interface StationModel3DProps {
  station: StationTelemetry;
  earthRadius: number;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Detailed 3D mesh for the International Space Station (ISS)
 * Features main Integrated Truss, pressurized habitat modules, and 4 pairs of golden solar arrays
 */
function IssMesh({ isSelected }: { isSelected: boolean }) {
  return (
    <group scale={isSelected ? 1.25 : 1.0}>
      {/* Main Integrated Truss Structure (X-axis) */}
      <mesh>
        <boxGeometry args={[0.26, 0.014, 0.014]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Pressurized Modules (Zvezda, Zarya, Destiny, Harmony, Columbus, Kibo along Z-axis) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.14, 12]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Cross Node Modules (Columbus & Kibo) */}
      <mesh position={[0, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, 0.08, 10]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* 8 Main Solar Array Wings (4 Port, 4 Starboard) */}
      {[-0.11, -0.075, 0.075, 0.11].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Upper Wing */}
          <mesh position={[0, 0, 0.065]}>
            <boxGeometry args={[0.024, 0.003, 0.1]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#b45309"
              emissiveIntensity={0.45}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
          {/* Lower Wing */}
          <mesh position={[0, 0, -0.065]}>
            <boxGeometry args={[0.024, 0.003, 0.1]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#b45309"
              emissiveIntensity={0.45}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Central Beacon Glow */}
      <mesh>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Detailed 3D mesh for the Chinese Space Station Tiangong (CSS)
 * Features T-shaped core (Tianhe + Wentian + Mengtian) and large flexible solar arrays
 */
function TiangongMesh({ isSelected }: { isSelected: boolean }) {
  return (
    <group scale={isSelected ? 1.25 : 1.0}>
      {/* Core Module Tianhe (Z-axis) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 12]} />
        <meshStandardMaterial color="#fef3c7" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Laboratory Modules Wentian & Mengtian forming the 'T' (X-axis) */}
      <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.16, 12]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Docking Hub Sphere */}
      <mesh position={[0, 0, 0.03]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.5} />
      </mesh>

      {/* Large Solar Wings at the ends of Wentian & Mengtian */}
      {[-0.085, 0.085].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0.03]}>
          <mesh position={[0, 0, 0.065]}>
            <boxGeometry args={[0.028, 0.003, 0.095]} />
            <meshStandardMaterial
              color="#eab308"
              emissive="#ca8a04"
              emissiveIntensity={0.5}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0, -0.065]}>
            <boxGeometry args={[0.028, 0.003, 0.095]} />
            <meshStandardMaterial
              color="#eab308"
              emissive="#ca8a04"
              emissiveIntensity={0.5}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const StationModel3D: React.FC<StationModel3DProps> = ({
  station,
  earthRadius,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  // Exaggerate altitude slightly for clear 3D visual separation above Earth's surface
  const orbitRadius = earthRadius * (1 + Math.max(0.085, station.altKm / 4200));

  const position = useMemo(
    () => latLonToVector3(station.lat, station.lon, orbitRadius),
    [station.lat, station.lon, orbitRadius]
  );

  const surfacePoint = useMemo(
    () => latLonToVector3(station.lat, station.lon, earthRadius * 1.002),
    [station.lat, station.lon, earthRadius]
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.lookAt(0, 0, 0);
    }
    if (pulseRingRef.current) {
      const t = (clock.getElapsedTime() * 1.6) % 1;
      const scale = 1 + t * 2.2;
      pulseRingRef.current.scale.set(scale, scale, scale);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.7;
    }
  });

  return (
    <group>
      {/* Vertical Nadir Laser Line from satellite to sub-satellite point on Earth */}
      <Line
        points={[surfacePoint, position]}
        color={station.color}
        lineWidth={1.5}
        transparent
        opacity={0.65}
      />

      {/* Sub-satellite point dot on Earth surface */}
      <mesh position={surfacePoint}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshBasicMaterial color={station.color} />
      </mesh>

      {/* 3D Spacecraft Model in Orbit */}
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {station.id === 'iss' ? (
          <IssMesh isSelected={isSelected} />
        ) : (
          <TiangongMesh isSelected={isSelected} />
        )}

        {/* Pulsating 3D Selection Halo */}
        <mesh ref={pulseRingRef}>
          <ringGeometry args={[0.04, 0.052, 24]} />
          <meshBasicMaterial
            color={station.color}
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Floating Interactive HUD Label (Compact & Off-Centered to keep 3D model visible) */}
        <Html distanceFactor={5} position={[0, 0.04, 0]} zIndexRange={[10, 0]}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`translate-x-3.5 -translate-y-6 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider whitespace-nowrap transition-all shadow-lg border backdrop-blur-md flex items-center gap-1 ${
              isSelected
                ? 'bg-slate-900/95 text-white border-cyan-400 ring-1 ring-cyan-400/30'
                : 'bg-slate-950/80 text-slate-200 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: station.color }}
            />
            <span>{station.shortName}</span>
            <span className="text-[9px] text-slate-400">{Math.round(station.altKm)}km</span>
          </button>
        </Html>
      </group>
    </group>
  );
};
