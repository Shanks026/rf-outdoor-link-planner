import React, { useState, useRef } from "react";
import MapProvider from "./components/MapProvider";
import SidebarPanel from "./components/SidebarPanel";

export default function App() {
  const [towers, setTowers] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // Pin placement state
  const [pinA, setPinA] = useState(null);
  const [pinB, setPinB] = useState(null);
  const [placingPin, setPlacingPin] = useState(null); // null | 'A' | 'B'

  // Track tower IDs created from pin placement
  const [pinATowerId, setPinATowerId] = useState(null);
  const [pinBTowerId, setPinBTowerId] = useState(null);

  const handleStartPlacingPin = (pinType) => {
    setPlacingPin(pinType);
  };

  const handlePinPlaced = (pinType, coords, towerId) => {
    const pinObj = { ...coords, planId: currentPlanId, towerId };
    if (pinType === "A") {
      setPinA(pinObj);
      setPinATowerId(towerId);
    }
    if (pinType === "B") {
      setPinB(pinObj);
      setPinBTowerId(towerId);
    }
    setPlacingPin(null);
  };

  const onClearPinA = () => {
    setPinA(null);
    setPlacingPin(null);
    // Remove the tower marker from map
    if (pinATowerId) {
      setTowers((prev) => prev.filter((t) => t.id !== pinATowerId));
      setPinATowerId(null);
    }
  };

  const onClearPinB = () => {
    setPinB(null);
    setPlacingPin(null);
    // Remove the tower marker from map
    if (pinBTowerId) {
      setTowers((prev) => prev.filter((t) => t.id !== pinBTowerId));
      setPinBTowerId(null);
    }
  };

  const onClearPins = () => {
    setPinA(null);
    setPinB(null);
    setPlacingPin(null);
    // Remove both tower markers from map
    const idsToRemove = [pinATowerId, pinBTowerId].filter(Boolean);
    if (idsToRemove.length > 0) {
      setTowers((prev) => prev.filter((t) => !idsToRemove.includes(t.id)));
    }
    setPinATowerId(null);
    setPinBTowerId(null);
  };

  const handlePlanSaved = (plan) => {
    setCurrentPlanId(plan.id);
    onClearPins(); // reset pins on plan change
  };

  const handlePlanDeleted = (planId) => {
    if (planId === currentPlanId) {
      setPinA(null);
      setPinB(null);
      setCurrentPlanId(null);
      // Remove both tower markers
      const idsToRemove = [pinATowerId, pinBTowerId].filter(Boolean);
      if (idsToRemove.length > 0) {
        setTowers((prev) => prev.filter((t) => !idsToRemove.includes(t.id)));
      }
      setPinATowerId(null);
      setPinBTowerId(null);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden m-0 p-0">
      <main className="h-full w-full">
        <div className="h-full w-full flex items-stretch">
          <div className="flex-1 h-full w-full bg-[var(--color-background)]">
            <div className="h-full w-full" id="map-root">
              <MapProvider
                towers={towers}
                setTowers={setTowers}
                links={links}
                setLinks={setLinks}
                onSelectLink={setSelectedLink}
                placingPin={placingPin}
                onPinPlaced={handlePinPlaced}
              />

              <SidebarPanel
                title="RF Outdoor Link Planner"
                pinA={pinA}
                pinB={pinB}
                placingPin={placingPin}
                onStartPlacingPin={handleStartPlacingPin}
                onClearPinA={onClearPinA}
                onClearPinB={onClearPinB}
                onClearPins={onClearPins}
                onPlanSaved={handlePlanSaved}
                onPlanDeleted={handlePlanDeleted}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
