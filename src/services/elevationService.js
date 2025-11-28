// services/elevationService.js
export class ElevationService {
  static async getElevationProfile(lat1, lng1, lat2, lng2, samples = 100) {
    try {
      // Generate points along the line between two towers
      const points = this.generatePointsAlongLine(
        lat1,
        lng1,
        lat2,
        lng2,
        samples
      );

      // Use Open-Elevation API
      const response = await fetch(
        "https://api.open-elevation.com/api/v1/lookup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locations: points.map((point) => ({
              latitude: point.lat,
              longitude: point.lng,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Elevation API request failed");
      }

      const data = await response.json();
      return data.results.map((result, index) => ({
        lat: points[index].lat,
        lng: points[index].lng,
        elevation: result.elevation,
        distanceFromStart: points[index].distanceFromStart,
      }));
    } catch (error) {
      console.error("Error fetching elevation data:", error);
      // Fallback: return flat terrain
      return this.generateFlatTerrain(lat1, lng1, lat2, lng2, samples);
    }
  }

  static generatePointsAlongLine(lat1, lng1, lat2, lng2, samples) {
    const points = [];
    const totalDistance = this.calculateDistance(lat1, lng1, lat2, lng2);

    for (let i = 0; i < samples; i++) {
      const fraction = i / (samples - 1);
      const lat = lat1 + (lat2 - lat1) * fraction;
      const lng = lng1 + (lng2 - lng1) * fraction;
      const distanceFromStart = totalDistance * fraction;

      points.push({ lat, lng, distanceFromStart });
    }

    return points;
  }

  static generateFlatTerrain(lat1, lng1, lat2, lng2, samples) {
    const points = this.generatePointsAlongLine(
      lat1,
      lng1,
      lat2,
      lng2,
      samples
    );
    return points.map((point) => ({
      ...point,
      elevation: 0, // Assume sea level as fallback
    }));
  }

  static calculateDistance(lat1, lng1, lat2, lng2) {
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
