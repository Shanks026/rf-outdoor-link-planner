// src/lib/geo.js
export function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// freqHz = e.g. 5e9
export function fresnelRadiusAtPoint(freqHz, d1_m, d2_m) {
  const c = 3e8; // speed of light (m/s)
  const lambda = c / freqHz;
  const r = Math.sqrt((lambda * d1_m * d2_m) / (d1_m + d2_m));
  return r; // in meters
}

// sample N points evenly along lat/lng line (simple linear interpolation)
export function sampleLinePositions(a, b, samples) {
  const arr = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    arr.push({
      lat: a.lat * (1 - t) + b.lat * t,
      lng: a.lng * (1 - t) + b.lng * t,
      distFrac: t,
    });
  }
  return arr;
}
