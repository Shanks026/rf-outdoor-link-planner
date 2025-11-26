import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Polyline,
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
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [pendingPos, setPendingPos] = useState(null);
  const [pendingPinType, setPendingPinType] = useState(null);
  const mapRef = useRef(null);

  // Store initial center and don't change it
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 78 });
  const hasInitialized = useRef(false);

  const [linkMode, setLinkMode] = useState(false);
  const [selectedTowerId, setSelectedTowerId] = useState(null);
  const [showFreqMismatchConfirm, setShowFreqMismatchConfirm] = useState(false);
  const [linkCandidate, setLinkCandidate] = useState(null);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    // Set initial center once when map loads
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
      // Only respond if currently placing a pin
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
      if (!linkMode) return;

      if (!selectedTowerId) {
        setSelectedTowerId(tower.id);
        return;
      }

      if (selectedTowerId === tower.id) {
        setSelectedTowerId(null);
        return;
      }

      const a = towers.find((t) => t.id === selectedTowerId);
      const b = tower;
      if (!a || !b) {
        setSelectedTowerId(null);
        setLinkMode(false);
        return;
      }
      if (a.frequencyHz !== b.frequencyHz) {
        setLinkCandidate({ aId: a.id, bId: b.id });
        setShowFreqMismatchConfirm(true);
        return;
      }
      createLink(a, b);
    },
    [linkMode, selectedTowerId, towers]
  );

  function createLink(a, b, override = false) {
    if (!override && a.frequencyHz !== b.frequencyHz) {
      console.warn("Frequencies mismatch and override not allowed");
      return;
    }
    const newLink = {
      id: `link-${Date.now()}`,
      towerAId: a.id,
      towerBId: b.id,
      frequencyHz: a.frequencyHz,
      createdAt: new Date().toISOString(),
      calculations: [],
    };
    setLinks([...links, newLink]);
    setLinkMode(false);
    setSelectedTowerId(null);
    setLinkCandidate(null);
    setShowFreqMismatchConfirm(false);
  }

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
        {towers.map((t) => (
          <Marker
            key={t.id}
            position={{ lat: t.lat, lng: t.lng }}
            label={t.name}
            onClick={() => handleMarkerClick(t)}
          />
        ))}

        {links.map((link) => {
          const a = towers.find((x) => x.id === link.towerAId);
          const b = towers.find((x) => x.id === link.towerBId);
          if (!a || !b) return null;
          return (
            <Polyline
              key={link.id}
              path={[
                { lat: a.lat, lng: a.lng },
                { lat: b.lat, lng: b.lng },
              ]}
              onClick={() => onSelectLink && onSelectLink(link)}
              options={{ strokeColor: "#2b6cb0", strokeWeight: 3 }}
            />
          );
        })}
      </GoogleMap>

      {showFreqMismatchConfirm && linkCandidate && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-60">
          <div className="bg-yellow-50 dark:bg-yellow-900/60 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 shadow">
            <div className="text-sm">
              Frequencies do not match between selected towers. Create link
              anyway?
            </div>
            <div className="mt-2 flex gap-2 justify-end">
              <button
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700"
                onClick={() => {
                  setShowFreqMismatchConfirm(false);
                  setLinkCandidate(null);
                  setSelectedTowerId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded bg-green-600 text-white"
                onClick={() => {
                  const a = towers.find((t) => t.id === linkCandidate.aId);
                  const b = towers.find((t) => t.id === linkCandidate.bId);
                  createLink(a, b, true);
                }}
              >
                Create link (override)
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPos && pendingPinType && (
        <TowerFormModal
          position={pendingPos}
          onClose={() => {
            setPendingPos(null);
            setPendingPinType(null);
          }}
          onSave={(towerData) => {
            const towerName = `Tower ${pendingPinType}`;
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
              towerId
            );
            setPendingPos(null);
            setPendingPinType(null);
          }}
        />
      )}
    </>
  );
}
