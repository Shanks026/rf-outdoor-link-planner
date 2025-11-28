// utils/fresnelCalculator.js
export class FresnelCalculator {
  static calculateFirstFresnelRadius(frequencyHz, d1, d2) {
    const c = 3e8; // speed of light in m/s
    const wavelength = c / frequencyHz; // wavelength in meters
    const totalDistance = d1 + d2;

    if (totalDistance === 0) return 0;

    // First Fresnel zone radius formula
    const radius = Math.sqrt((wavelength * d1 * d2) / totalDistance);
    return radius;
  }

  // utils/fresnelCalculator.js
  static calculateFresnelZonePoints(
    towerA,
    towerB,
    elevationProfile,
    frequencyHz
  ) {
    const points = [];
    const totalDistance = this.calculateDistance(
      towerA.lat,
      towerA.lng,
      towerB.lat,
      towerB.lng
    ); // meters

    if (!elevationProfile || elevationProfile.length === 0) return points;

    // Helper to get local bearing between neighboring samples.
    const getLocalBearing = (idx) => {
      const current = elevationProfile[idx];
      const next = elevationProfile[idx + 1];
      const prev = elevationProfile[idx - 1];

      if (next) {
        return this.calculateBearing(
          current.lat,
          current.lng,
          next.lat,
          next.lng
        );
      } else if (prev) {
        return this.calculateBearing(
          prev.lat,
          prev.lng,
          current.lat,
          current.lng
        );
      } else {
        return this.calculateBearing(
          towerA.lat,
          towerA.lng,
          towerB.lat,
          towerB.lng
        );
      }
    };

    elevationProfile.forEach((point, idx) => {
      const d1 = point.distanceFromStart; // meters from tower A
      const d2 = Math.max(totalDistance - d1, 0.0001); // meters to tower B

      const fresnelRadius = this.calculateFirstFresnelRadius(
        frequencyHz,
        d1,
        d2
      ); // meters

      // Use a small fixed minimum for visibility on very short links
      const minVisibleMeters = 0.5; // tweak as needed
      const visibleRadius = Math.max(fresnelRadius, minVisibleMeters);

      // Use local bearing so the perpendicular follows the path direction
      const bearing = getLocalBearing(idx);
      const perpendicularBearing = (bearing + 90) % 360;

      const leftPoint = this.calculateDestinationPoint(
        point.lat,
        point.lng,
        perpendicularBearing,
        visibleRadius
      );
      const rightPoint = this.calculateDestinationPoint(
        point.lat,
        point.lng,
        (perpendicularBearing + 180) % 360,
        visibleRadius
      );

      points.push({
        distanceFromStart: d1,
        centerLat: point.lat,
        centerLng: point.lng,
        fresnelRadius,
        visibleRadius,
        leftPoint,
        rightPoint,
        elevation: point.elevation,
      });
    });

    // Optional debug logs
    try {
      const maxF = Math.max(...points.map((p) => p.fresnelRadius));
      const maxVis = Math.max(...points.map((p) => p.visibleRadius));
      console.log(`Max Fresnel radius: ${maxF.toFixed(2)} m`);
      console.log(`Max visible radius: ${maxVis.toFixed(2)} m`);
    } catch (e) {}

    return points;
  }

  static calculateBearing(lat1, lng1, lat2, lng2) {
    const toRad = (val) => (val * Math.PI) / 180;
    const toDeg = (val) => (val * 180) / Math.PI;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lng2 - lng1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (toDeg(θ) + 360) % 360;
  }

  static calculateDestinationPoint(lat, lng, bearing, distance) {
    const toRad = (val) => (val * Math.PI) / 180;
    const toDeg = (val) => (val * 180) / Math.PI;

    const R = 6371000; // Earth radius in meters
    const δ = distance / R; // angular distance in radians
    const θ = toRad(bearing);

    const φ1 = toRad(lat);
    const λ1 = toRad(lng);

    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );

    return {
      lat: toDeg(φ2),
      lng: toDeg(λ2),
    };
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

  static calculateLinkClearance(
    fresnelPoints,
    elevationProfile,
    towerA,
    towerB
  ) {
    let totalBlocked = 0;
    let totalPoints = 0;
    let maxBlockage = 0;

    fresnelPoints.forEach((fresnelPoint, index) => {
      const terrainElevation = elevationProfile[index].elevation;
      const distanceFromA = fresnelPoint.distanceFromStart;
      const totalDistance =
        distanceFromA +
        (fresnelPoints[fresnelPoints.length - 1]?.distanceFromStart -
          distanceFromA);

      // Calculate the height of the radio path at this point (straight line between antennas)
      const pathHeight =
        towerA.heightM +
        (towerB.heightM - towerA.heightM) * (distanceFromA / totalDistance);

      // Calculate the height of the required clearance line (radio path + 60% Fresnel zone)
      const requiredClearanceHeight =
        pathHeight + fresnelPoint.fresnelRadius * 0.6;

      // Check if terrain is above the required clearance line
      if (terrainElevation > requiredClearanceHeight) {
        totalBlocked++;
        const blockage = terrainElevation - requiredClearanceHeight;
        maxBlockage = Math.max(maxBlockage, blockage);
      }
      totalPoints++;
    });

    const clearancePercentage =
      ((totalPoints - totalBlocked) / totalPoints) * 100;
    return {
      clearancePercentage,
      isClear: clearancePercentage > 80, // 80% clearance threshold
      maxBlockage,
      blockedPoints: totalBlocked,
      totalPoints,
    };
  }
}
