import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Polyline,
  Polygon,
} from "@react-google-maps/api";
import TowerFormModal from "./TowerFormModal";

const libraries = ["places"];

export default function MapProvider({
  towers,
  links,
  setTowers,
  setLinks,
  onSelectLink,
  placingPin,
  onPinPlaced,
  linkMode, // boolean: connect towers step active
  towerAId, // selected tower A id
  towerBId, // selected tower B id
  onSelectTowerA, // (towerId) => void
  onSelectTowerB, // (towerId) => void
  fresnelData, // New prop for Fresnel zone data
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [pendingPos, setPendingPos] = useState(null);
  const [pendingPinType, setPendingPinType] = useState(null);
  const mapRef = useRef(null);

  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 78 });
  const hasInitialized = useRef(false);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (!hasInitialized.current && map) {
      const center = map.getCenter();
      if (center) {
        setMapCenter({ lat: center.lat(), lng: center.lng() });
        hasInitialized.current = true;
      }
    }
  }, []);

  const handleMapClick = useCallback(
    (e) => {
      if (!placingPin) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPendingPos({ lat, lng });
      setPendingPinType(placingPin);
    },
    [placingPin]
  );

  const handleMarkerClick = useCallback(
    (tower) => {
      if (linkMode) {
        // Existing link mode logic
        if (!towerAId && !towerBId) {
          onSelectTowerA(tower.id);
          return;
        }
        if (towerAId === tower.id) {
          onSelectTowerA(null);
          return;
        }
        if (towerBId === tower.id) {
          onSelectTowerB(null);
          return;
        }
        if (towerAId && !towerBId) {
          onSelectTowerB(tower.id);
          return;
        }
        if (!towerAId && towerBId) {
          onSelectTowerA(tower.id);
          return;
        }
        onSelectTowerB(tower.id);
      } else {
        // NEW: Auto-enable connection when clicking towers without being in link mode
        if (!towerAId) {
          onSelectTowerA(tower.id);
        } else if (!towerBId && towerAId !== tower.id) {
          onSelectTowerB(tower.id);
        } else if (towerAId === tower.id) {
          onSelectTowerA(null);
        } else if (towerBId === tower.id) {
          onSelectTowerB(null);
        }
      }
    },
    [linkMode, towerAId, towerBId, onSelectTowerA, onSelectTowerB]
  );

  const handleLinkClick = useCallback(
    (link) => {
      if (window.confirm("Are you sure you want to remove this link?")) {
        setLinks((prev) => prev.filter((l) => l.id !== link.id));
      }
    },
    [setLinks]
  );

  // MapProvider.js (update getFresnelPolygonPath)
  const simplifyDouglasPeucker = (points, epsilon) => {
    // points: [{lat, lng}, ...]
    if (!points || points.length < 3) return points;

    // helper: perpendicular distance from point C to line AB
    const perpDist = (A, B, C) => {
      const x1 = A.lat,
        y1 = A.lng;
      const x2 = B.lat,
        y2 = B.lng;
      const x0 = C.lat,
        y0 = C.lng;
      const num = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
      const den = Math.hypot(y2 - y1, x2 - x1);
      return den === 0 ? Math.hypot(x0 - x1, y0 - y1) : num / den;
    };

    const rdp = (pts, eps) => {
      if (pts.length < 3) return pts;
      let maxDist = 0;
      let index = -1;
      const A = pts[0];
      const B = pts[pts.length - 1];

      for (let i = 1; i < pts.length - 1; i++) {
        const d = perpDist(A, B, pts[i]);
        if (d > maxDist) {
          index = i;
          maxDist = d;
        }
      }

      if (maxDist > eps) {
        const left = rdp(pts.slice(0, index + 1), eps);
        const right = rdp(pts.slice(index), eps);
        return left.slice(0, -1).concat(right);
      } else {
        return [A, B];
      }
    };

    return rdp(points, epsilon);
  };

  const getFresnelPolygonPath = useCallback((fresnelPoints, options = {}) => {
    if (!fresnelPoints || fresnelPoints.length === 0) {
      console.warn("No fresnel points provided");
      return [];
    }

    try {
      const leftPoints = fresnelPoints
        .map((point) => {
          if (
            !point.leftPoint ||
            typeof point.leftPoint.lat !== "number" ||
            typeof point.leftPoint.lng !== "number"
          ) {
            console.warn("Invalid leftPoint:", point.leftPoint);
            return null;
          }
          return {
            lat: point.leftPoint.lat,
            lng: point.leftPoint.lng,
          };
        })
        .filter(Boolean);

      const rightPoints = fresnelPoints
        .map((point) => {
          if (
            !point.rightPoint ||
            typeof point.rightPoint.lat !== "number" ||
            typeof point.rightPoint.lng !== "number"
          ) {
            console.warn("Invalid rightPoint:", point.rightPoint);
            return null;
          }
          return {
            lat: point.rightPoint.lat,
            lng: point.rightPoint.lng,
          };
        })
        .filter(Boolean)
        .reverse();

      if (leftPoints.length === 0 || rightPoints.length === 0) {
        console.warn("No valid points for polygon");
        return [];
      }

      let path = [...leftPoints, ...rightPoints];

      // Ensure polygon closes explicitly
      const first = path[0];
      const last = path[path.length - 1];
      if (first.lat !== last.lat || first.lng !== last.lng) {
        path.push({ lat: first.lat, lng: first.lng });
      }

      // Optional: simplify path (epsilon in degrees); default off. E.g. epsilon = 1e-4 ~ ~11m
      if (options.simplifyEpsilon && options.simplifyEpsilon > 0) {
        path = simplifyDouglasPeucker(path, options.simplifyEpsilon);
        // ensure closure after simplify
        const f = path[0];
        const l = path[path.length - 1];
        if (f.lat !== l.lat || f.lng !== l.lng) {
          path.push({ lat: f.lat, lng: f.lng });
        }
      }

      console.log("Generated polygon with", path.length, "points");
      return path;
    } catch (error) {
      console.error("Error generating fresnel polygon path:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    console.log("MapProvider - fresnelData received:", fresnelData);
    if (fresnelData && fresnelData.fresnelPoints) {
      console.log("Fresnel points count:", fresnelData.fresnelPoints.length);
      console.log("First fresnel point:", fresnelData.fresnelPoints[0]);

      const polygonPath = getFresnelPolygonPath(fresnelData.fresnelPoints);
      console.log("Generated polygon path:", polygonPath);
      console.log("Polygon path length:", polygonPath.length);
    }
  }, [fresnelData, getFresnelPolygonPath]);

  // Check if we have standalone Fresnel data (not associated with current links)
  const hasStandaloneFresnel =
    fresnelData &&
    !links.some((link) => link.id === fresnelData.linkId) &&
    fresnelData.fresnelPoints;

  // Auto-fit map to show Fresnel zone when calculated
  useEffect(() => {
    if (fresnelData && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();

      // Add tower positions
      bounds.extend({
        lat: fresnelData.towerA.lat,
        lng: fresnelData.towerA.lng,
      });
      bounds.extend({
        lat: fresnelData.towerB.lat,
        lng: fresnelData.towerB.lng,
      });

      // Add Fresnel zone bounds
      fresnelData.fresnelPoints.forEach((point) => {
        bounds.extend(point.leftPoint);
        bounds.extend(point.rightPoint);
      });

      mapRef.current.fitBounds(bounds);

      // Add some padding
      mapRef.current.panToBounds(bounds);
    }
  }, [fresnelData]);

  if (loadError) return <div>Google Maps failed to load</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
      <GoogleMap
        onLoad={handleMapLoad}
        zoom={6}
        center={mapCenter}
        mapContainerClassName="w-full h-full"
        onClick={handleMapClick}
        options={{
          cursor: placingPin ? "crosshair" : "default",
        }}
      >
        {towers.map((t) => {
          const isA = towerAId === t.id;
          const isB = towerBId === t.id;

          const isSelected = isA || isB;

          return (
            <Marker
              key={t.id}
              position={{ lat: t.lat, lng: t.lng }}
              label={t.name}
              onClick={() => handleMarkerClick(t)}
              icon={
                isSelected
                  ? {
                      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                      anchor: new window.google.maps.Point(16, 32),
                      scaledSize: new window.google.maps.Size(32, 32),
                    }
                  : undefined
              }
            />
          );
        })}
        {links.map((link) => {
          const a = towers.find((x) => x.id === link.towerAId);
          const b = towers.find((x) => x.id === link.towerBId);

          // Only render if BOTH towers exist
          if (!a || !b) {
            return null;
          }

          const isActiveFresnel = fresnelData && fresnelData.linkId === link.id;

          return (
            <React.Fragment key={link.id}>
              <Polyline
                path={[
                  { lat: a.lat, lng: a.lng },
                  { lat: b.lat, lng: b.lng },
                ]}
                onClick={() => handleLinkClick(link)}
                options={{
                  strokeColor: isActiveFresnel ? "#059669" : "#2b6cb0",
                  strokeWeight: isActiveFresnel ? 4 : 3,
                  strokeOpacity: isActiveFresnel ? 0.8 : 1,
                  cursor: "pointer",
                }}
              />

              {/* Fresnel Zone Visualization for active links */}
              {isActiveFresnel && fresnelData.fresnelPoints && (
                <>
                  <Polygon
                    paths={getFresnelPolygonPath(fresnelData.fresnelPoints)}
                    options={{
                      fillColor: fresnelData.clearance.isClear
                        ? "#10B981"
                        : "#F59E0B",
                      fillOpacity: 0.2,
                      strokeColor: fresnelData.clearance.isClear
                        ? "#059669"
                        : "#D97706",
                      strokeWeight: 2,
                      strokeOpacity: 0.6,
                    }}
                  />

                  {/* Center line markers for elevation points */}
                  {fresnelData.elevationProfile.map((point, index) => (
                    <Marker
                      key={`elevation-${index}`}
                      position={{ lat: point.lat, lng: point.lng }}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 3,
                        fillColor: "#3B82F6",
                        fillOpacity: 0.7,
                        strokeWeight: 1,
                        strokeColor: "#1D4ED8",
                      }}
                    />
                  ))}

                  {/* Tower markers with enhanced styling for Fresnel mode */}
                  <Marker
                    position={{ lat: a.lat, lng: a.lng }}
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                      anchor: new window.google.maps.Point(16, 32),
                      scaledSize: new window.google.maps.Size(40, 40),
                    }}
                  />

                  <Marker
                    position={{ lat: b.lat, lng: b.lng }}
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                      anchor: new window.google.maps.Point(16, 32),
                      scaledSize: new window.google.maps.Size(40, 40),
                    }}
                  />
                </>
              )}
            </React.Fragment>
          );
        })}
        {/* Standalone Fresnel zone for links not in the current links array */}
        {hasStandaloneFresnel && (
          <>
            <Polygon
              paths={getFresnelPolygonPath(fresnelData.fresnelPoints)}
              options={{
                fillColor: fresnelData.clearance.isClear
                  ? "#10B981"
                  : "#F59E0B",
                fillOpacity: 0.3,
                strokeColor: fresnelData.clearance.isClear
                  ? "#059669"
                  : "#D97706",
                strokeWeight: 3,
                strokeOpacity: 0.8,
              }}
            />

            {/* Draw the link line */}
            <Polyline
              path={[
                { lat: fresnelData.towerA.lat, lng: fresnelData.towerA.lng },
                { lat: fresnelData.towerB.lat, lng: fresnelData.towerB.lng },
              ]}
              options={{
                strokeColor: "#059669",
                strokeWeight: 4,
                strokeOpacity: 0.8,
              }}
            />

            {/* Debug: Show center line */}
            <Polyline
              path={fresnelData.fresnelPoints.map((point) => ({
                lat: point.centerLat,
                lng: point.centerLng,
              }))}
              options={{
                strokeColor: "#FF0000",
                strokeWeight: 1,
                strokeOpacity: 0.6,
              }}
            />

            {/* Debug: Show radius markers */}
            {fresnelData.fresnelPoints
              .filter((_, i) => i % 5 === 0)
              .map((point, index) => (
                <Marker
                  key={`radius-${index}`}
                  position={{ lat: point.centerLat, lng: point.centerLng }}
                  label={
                    point.visibleRadius
                      ? point.visibleRadius.toFixed(1)
                      : point.fresnelRadius.toFixed(1)
                  }
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: "#FF0000",
                    fillOpacity: 0.7,
                    strokeWeight: 1,
                    strokeColor: "#FFFFFF",
                  }}
                />
              ))}

            {/* Tower markers */}
            <Marker
              position={{
                lat: fresnelData.towerA.lat,
                lng: fresnelData.towerA.lng,
              }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                anchor: new window.google.maps.Point(16, 32),
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />

            <Marker
              position={{
                lat: fresnelData.towerB.lat,
                lng: fresnelData.towerB.lng,
              }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                anchor: new window.google.maps.Point(16, 32),
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          </>
        )}
      </GoogleMap>

      {pendingPos && pendingPinType && (
        <TowerFormModal
          position={pendingPos}
          onClose={() => {
            setPendingPos(null);
            setPendingPinType(null);
          }}
          onSave={(towerData) => {
            const towerName = towerData?.name || `Tower ${towers.length + 1}`;
            const towerId = `tower-${Date.now()}`;
            const newTower = {
              id: towerId,
              name: towerName,
              lat: pendingPos.lat,
              lng: pendingPos.lng,
              frequencyHz: towerData.frequencyHz,
              heightM: towerData.heightM || 20,
              createdAt: new Date().toISOString(),
            };
            setTowers((prev) => [...prev, newTower]);
            onPinPlaced(
              pendingPinType,
              {
                lat: pendingPos.lat,
                lng: pendingPos.lng,
              },
              towerId,
              towerData
            );
            setPendingPos(null);
            setPendingPinType(null);
          }}
        />
      )}
    </>
  );
}
