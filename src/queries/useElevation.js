// src/queries/useElevations.js
import { useQuery } from "@tanstack/react-query";

/**
 * path: array of [lat, lng] or string "lat,lng|lat2,lng2"
 * samples: number
 */
async function fetchElevationPath(a, b, samples = 50) {
  const pathParam = `${a.lat},${a.lng}|${b.lat},${b.lng}`;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/elevation/json?path=${encodeURIComponent(
    pathParam
  )}&samples=${samples}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Elevation API request failed");
  const json = await res.json();
  if (json.status !== "OK")
    throw new Error("Elevation API returned error: " + json.status);
  // json.results is an array of { elevation, location: {lat,lng}, resolution }
  return json.results;
}

export default function useElevationsForLink(link, towers, samples = 50) {
  const a = towers.find((t) => t.id === link.towerAId);
  const b = towers.find((t) => t.id === link.towerBId);
  return useQuery(
    ["elevations", link.id, samples],
    () => fetchElevationPath(a, b, samples),
    { enabled: !!a && !!b }
  );
}
