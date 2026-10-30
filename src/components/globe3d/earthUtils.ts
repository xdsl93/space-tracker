import * as THREE from 'three';
import { WORLD_LAND_POLYGONS } from '../../data/worldLandPolygons';

/**
 * Converts (lat, lon) in degrees and radius to Three.js Cartesian coordinates
 * matching THREE.SphereGeometry UV layout: +Y = North Pole, +X = (0°N, 0°E), -Z = (0°N, 90°E)
 */
export function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Generates high-contrast procedural Day & Night textures on an HTML5 Canvas
 * as immediate offline-capable textures, which can also be upgraded with remote textures.
 */
export function createProceduralEarthTextures(): {
  dayTexture: THREE.CanvasTexture;
  nightTexture: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  // 1. Day Texture Canvas
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = width;
  dayCanvas.height = height;
  const dCtx = dayCanvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = dCtx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c2444');
  oceanGrad.addColorStop(0.5, '#073466');
  oceanGrad.addColorStop(1, '#0c2444');
  dCtx.fillStyle = oceanGrad;
  dCtx.fillRect(0, 0, width, height);

  // Subtle lat/lon graticule on day globe
  dCtx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  dCtx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    dCtx.beginPath();
    dCtx.moveTo(x, 0);
    dCtx.lineTo(x, height);
    dCtx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    dCtx.beginPath();
    dCtx.moveTo(0, y);
    dCtx.lineTo(width, y);
    dCtx.stroke();
  }

  // Draw continents on Day Texture
  dCtx.fillStyle = '#1e5245';
  dCtx.strokeStyle = '#38bdf8';
  dCtx.lineWidth = 1.8;

  for (const poly of WORLD_LAND_POLYGONS) {
    dCtx.beginPath();
    poly.forEach(([lon, lat]: [number, number], i: number) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (i === 0) dCtx.moveTo(x, y);
      else dCtx.lineTo(x, y);
    });
    dCtx.closePath();
    dCtx.fill();
    dCtx.stroke();
  }

  // 2. Night Texture Canvas
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = width;
  nightCanvas.height = height;
  const nCtx = nightCanvas.getContext('2d')!;

  nCtx.fillStyle = '#02050d';
  nCtx.fillRect(0, 0, width, height);

  nCtx.fillStyle = '#070f22';
  nCtx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  nCtx.lineWidth = 1.2;

  for (const poly of WORLD_LAND_POLYGONS) {
    nCtx.beginPath();
    poly.forEach(([lon, lat]: [number, number], i: number) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (i === 0) nCtx.moveTo(x, y);
      else nCtx.lineTo(x, y);
    });
    nCtx.closePath();
    nCtx.fill();
    nCtx.stroke();
  }

  // City lights clusters on night canvas (Major metropolitan hubs)
  const majorHubs: Array<[number, number, number]> = [
    [-74, 40.7, 14], [-87.6, 41.8, 10], [-118.2, 34, 12], [-99.1, 19.4, 11],
    [-46.6, -23.5, 12], [-58.3, -34.6, 10], [-0.1, 51.5, 14], [2.3, 48.8, 13],
    [12.5, 41.9, 12], [9.2, 45.4, 11], [13.4, 52.5, 11], [-3.7, 40.4, 10],
    [37.6, 55.7, 13], [31.2, 30.0, 12], [3.3, 6.5, 9], [28.0, -26.2, 9],
    [55.2, 25.2, 10], [72.8, 19.0, 13], [77.2, 28.6, 13], [100.5, 13.7, 11],
    [103.8, 1.3, 10], [114.1, 22.3, 13], [121.4, 31.2, 15], [116.4, 39.9, 14],
    [126.9, 37.5, 13], [139.6, 35.6, 16], [151.2, -33.8, 10]
  ];

  for (const [lon, lat, radius] of majorHubs) {
    const cx = ((lon + 180) / 360) * width;
    const cy = ((90 - lat) / 180) * height;
    const grad = nCtx.createRadialGradient(cx, cy, 1, cx, cy, radius * 2.2);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.55)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    nCtx.fillStyle = grad;
    nCtx.beginPath();
    nCtx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
    nCtx.fill();
  }

  const dayTexture = new THREE.CanvasTexture(dayCanvas);
  dayTexture.wrapS = THREE.RepeatWrapping;
  dayTexture.wrapT = THREE.ClampToEdgeWrapping;

  const nightTexture = new THREE.CanvasTexture(nightCanvas);
  nightTexture.wrapS = THREE.RepeatWrapping;
  nightTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { dayTexture, nightTexture };
}
