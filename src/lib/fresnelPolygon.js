// src/lib/fresnelPolygon.js
import {
  haversineDistanceMeters,
  fresnelRadiusAtPoint,
  sampleLinePositions,
} from "./geo";

/**
 * Returns array of {lat,lng} points forming an approximate polygon envelope for the Fresnel zone.
 */
export function buildFresnelEnvelope(a, b, freqHz, samples = 60) {
  const pts = sampleLinePositions(a, b, samples);

  // Precompute total distance for d1/d2
  const totalDistance = haversineDistanceMeters(a.lat, a.lng, b.lat, b.lng);

  // compute perpendicular offsets
  const offsetsPos = [];
  const offsetsNeg = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const d1 = haversineDistanceMeters(a.lat, a.lng, p.lat, p.lng);
    const d2 = totalDistance - d1;
    const r_m = fresnelRadiusAtPoint(freqHz, d1, d2);

    // compute small perpendicular vector in lat/lng
    // compute direction from previous or to next point
    const next = pts[Math.min(i + 1, pts.length - 1)];
    const prev = pts[Math.max(i - 1, 0)];
    const dx = next.lng - prev.lng;
    const dy = next.lat - prev.lat;
    // normal vector
    const nx = -dy;
    const ny = dx;
    // normalize
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    const ux = nx / len;
    const uy = ny / len;

    // convert r_m (meters) to degrees approx at this latitude
    const metersPerDegLat = 111320;
    const metersPerDegLng = metersPerDegLat * Math.cos((p.lat * Math.PI) / 180);
    const degOffsetLat = (uy * r_m) / metersPerDegLat;
    const degOffsetLng = (ux * r_m) / (metersPerDegLng || metersPerDegLat);

    offsetsPos.push({ lat: p.lat + degOffsetLat, lng: p.lng + degOffsetLng });
    offsetsNeg.push({ lat: p.lat - degOffsetLat, lng: p.lng - degOffsetLng });
  }

  // build polygon: pos offsets in order, then neg offsets in reverse
  const polygon = [...offsetsPos, ...offsetsNeg.reverse(), offsetsPos[0]];
  return polygon;
}
