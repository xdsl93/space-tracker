import { Line, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Compass, Crosshair } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSubsolarPoint } from '../../services/orbitalEngine';
import { StationId, StationTelemetry, UserLocation } from '../../types/station';
import { createProceduralEarthTextures, latLonToVector3 } from './earthUtils';
import { StationModel3D } from './StationModel3D';
import { UserMarker3D } from './UserMarker3D';

const EARTH_RADIUS = 1.65;

const DAY_NIGHT_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  void main() {
    vUv = uv;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DAY_NIGHT_FRAGMENT_SHADER = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormalWorld;

  void main() {
    vec3 normal = normalize(vNormalWorld);
    vec3 sunDir = normalize(sunDirection);
    float cosAngle = dot(normal, sunDir);

    // Smooth twilight transition across the solar terminator (-0.12 to +0.12)
    float dayMix = smoothstep(-0.14, 0.14, cosAngle);

    vec4 dayColor = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);

    // Diffuse lighting boost on day hemisphere
    float diffuse = max(0.25, cosAngle);
    vec3 litDay = dayColor.rgb * (0.45 + 0.75 * diffuse);

    // Twilight golden-cyan atmospheric rim along terminator
    float twilight = 1.0 - abs(cosAngle * 4.5);
    twilight = clamp(twilight, 0.0, 1.0);
    vec3 twilightGlow = vec3(0.95, 0.45, 0.15) * twilight * 0.18;

    vec3 finalRgb = mix(nightColor.rgb * 1.15, litDay, dayMix) + twilightGlow;
    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

interface EarthMeshProps {
  now: Date;
}

const EarthMesh: React.FC<EarthMeshProps> = ({ now }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { dayTexture, nightTexture } = useMemo(() => createProceduralEarthTextures(), []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
      (tex) => {
        if (materialRef.current) {
          materialRef.current.uniforms.dayMap.value = tex;
          materialRef.current.needsUpdate = true;
        }
      }
    );

    loader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg',
      (tex) => {
        if (materialRef.current) {
          materialRef.current.uniforms.nightMap.value = tex;
          materialRef.current.needsUpdate = true;
        }
      }
    );
  }, []);

  const sunDirection = useMemo(() => {
    const subsolar = getSubsolarPoint(now);
    return latLonToVector3(subsolar.lat, subsolar.lon, 1.0).normalize();
  }, [now]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayTexture },
      nightMap: { value: nightTexture },
      sunDirection: { value: sunDirection },
    }),
    [dayTexture, nightTexture]
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.sunDirection.value.copy(sunDirection);
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={DAY_NIGHT_VERTEX_SHADER}
          fragmentShader={DAY_NIGHT_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      <mesh scale={[1.028, 1.028, 1.028]}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

interface OrbitRibbon3DProps {
  station: StationTelemetry;
  isSelected: boolean;
}

const OrbitRibbon3D: React.FC<OrbitRibbon3DProps> = ({ station, isSelected }) => {
  const orbitRadius = EARTH_RADIUS * (1 + Math.max(0.085, station.altKm / 4200));

  const futurePoints = useMemo(() => {
    if (!station.futureTrack.length) return [];
    return station.futureTrack.map((pt) => latLonToVector3(pt.lat, pt.lon, orbitRadius));
  }, [station.futureTrack, orbitRadius]);

  const pastPoints = useMemo(() => {
    if (!station.pastTrack.length) return [];
    return station.pastTrack.map((pt) => latLonToVector3(pt.lat, pt.lon, orbitRadius));
  }, [station.pastTrack, orbitRadius]);

  if (futurePoints.length < 2) return null;

  return (
    <group>
      <Line
        points={futurePoints}
        color={station.color}
        lineWidth={isSelected ? 2.6 : 1.3}
        transparent
        opacity={isSelected ? 0.9 : 0.4}
      />
      {pastPoints.length >= 2 && (
        <Line
          points={pastPoints}
          color={station.color}
          lineWidth={1.2}
          dashed
          dashSize={0.05}
          gapSize={0.04}
          transparent
          opacity={isSelected ? 0.55 : 0.25}
        />
      )}
    </group>
  );
};

interface CameraFocusControllerProps {
  focusTarget: { lat: number; lon: number; trigger: number } | null;
}

const CameraFocusController: React.FC<CameraFocusControllerProps> = ({ focusTarget }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!focusTarget) return;
    const dist = camera.position.length() || 4.3;
    const targetVec = latLonToVector3(focusTarget.lat, focusTarget.lon, dist);
    camera.position.copy(targetVec);
    camera.lookAt(0, 0, 0);
  }, [focusTarget, camera]);

  return null;
};

interface EarthGlobe3DProps {
  now: Date;
  stations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
  onSelectStation: (id: StationId) => void;
  userLocation: UserLocation;
}

export const EarthGlobe3D: React.FC<EarthGlobe3DProps> = ({
  now,
  stations,
  selectedStationId,
  onSelectStation,
  userLocation,
}) => {
  const { t } = useLanguage();
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lon: number;
    trigger: number;
  } | null>(() => ({
    lat: stations[selectedStationId].lat,
    lon: stations[selectedStationId].lon,
    trigger: 1,
  }));

  const [followStation, setFollowStation] = useState<boolean>(false);

  useEffect(() => {
    if (followStation) {
      const st = stations[selectedStationId];
      setFocusTarget({ lat: st.lat, lon: st.lon, trigger: Date.now() });
    }
  }, [followStation, selectedStationId, stations[selectedStationId].lat, stations[selectedStationId].lon]);

  const subsolar = useMemo(() => getSubsolarPoint(now), [now]);
  const sunLightPos = useMemo(
    () => latLonToVector3(subsolar.lat, subsolar.lon, 12),
    [subsolar.lat, subsolar.lon]
  );

  const handleCenterOn = (lat: number, lon: number, lockFollow = false) => {
    setFollowStation(lockFollow);
    setFocusTarget({ lat, lon, trigger: Date.now() });
  };

  return (
    <div className="relative w-full h-full select-none bg-[#03060f] overflow-hidden">
      <Canvas
        camera={{ position: [0, 1.2, 4.3], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={sunLightPos} intensity={1.8} />

        <Stars radius={80} depth={40} count={3000} factor={3.2} saturation={0} fade />

        {/* Day/Night Earth */}
        <EarthMesh now={now} />

        {/* Orbital Paths for ISS and Tiangong */}
        <OrbitRibbon3D station={stations.iss} isSelected={selectedStationId === 'iss'} />
        <OrbitRibbon3D
          station={stations.tiangong}
          isSelected={selectedStationId === 'tiangong'}
        />

        {/* 3D Models for ISS & Tiangong */}
        <StationModel3D
          station={stations.iss}
          earthRadius={EARTH_RADIUS}
          isSelected={selectedStationId === 'iss'}
          onSelect={() => {
            onSelectStation('iss');
            handleCenterOn(stations.iss.lat, stations.iss.lon, false);
          }}
        />
        <StationModel3D
          station={stations.tiangong}
          earthRadius={EARTH_RADIUS}
          isSelected={selectedStationId === 'tiangong'}
          onSelect={() => {
            onSelectStation('tiangong');
            handleCenterOn(stations.tiangong.lat, stations.tiangong.lon, false);
          }}
        />

        {/* User Current Position 3D Marker */}
        <UserMarker3D userLocation={userLocation} earthRadius={EARTH_RADIUS} />

        <CameraFocusController focusTarget={focusTarget} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={2.35}
          maxDistance={7.5}
          rotateSpeed={0.65}
          zoomSpeed={0.9}
          onStart={() => setFollowStation(false)}
        />
      </Canvas>

      {/* Clean Centered Bottom Camera Quick-Focus Pill */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-950/90 border border-slate-800 backdrop-blur-md p-1 rounded-xl shadow-xl">
          <button
            onClick={() => {
              onSelectStation('iss');
              handleCenterOn(stations.iss.lat, stations.iss.lon, true);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-semibold flex items-center gap-1 transition ${
              selectedStationId === 'iss'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
            <span>{t.viewport.centerIss}</span>
          </button>

          <button
            onClick={() => {
              onSelectStation('tiangong');
              handleCenterOn(stations.tiangong.lat, stations.tiangong.lon, true);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-semibold flex items-center gap-1 transition ${
              selectedStationId === 'tiangong'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>{t.viewport.centerTiangong}</span>
          </button>

          <button
            onClick={() => handleCenterOn(userLocation.lat, userLocation.lon, false)}
            className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-semibold text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1 transition"
          >
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            <span>{t.viewport.myLocation}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
