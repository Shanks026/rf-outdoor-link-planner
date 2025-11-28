import React, { useEffect, useState } from "react";
import MapProvider from "./components/MapProvider";
import SidebarPanel from "./components/SidebarPanel";
import { toast } from "sonner";

export default function App() {
  const [towers, setTowers] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [placingPin, setPlacingPin] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [towerAId, setTowerAId] = useState(null);
  const [towerBId, setTowerBId] = useState(null);
  const [activeTab, setActiveTab] = useState("towers");
  const [fresnelData, setFresnelData] = useState(null);

  function handleDeleteLink(linkId) {
    setLinks((prev) => prev.filter((link) => link.id !== linkId));
  }

  useEffect(() => {
    if (towerAId && towerBId && activeTab !== "connection") {
      setActiveTab("connection");
    }
  }, [towerAId, towerBId, activeTab]);

  useEffect(() => {
    if (activeTab !== "connection") {
      setTowerAId(null);
      setTowerBId(null);
      setLinkMode(false);
    }
  }, [activeTab]);

  const handleFresnelCalculated = (data) => {
    setFresnelData(data);
  };

  const handleDeleteTower = (towerId) => {
    // Remove tower
    setTowers((prev) => prev.filter((t) => t.id !== towerId));

    // Remove ALL links that use this tower
    setLinks((prev) =>
      prev.filter(
        (link) => link.towerAId !== towerId && link.towerBId !== towerId
      )
    );

    // Clear selections if deleted tower was selected
    if (towerAId === towerId) setTowerAId(null);
    if (towerBId === towerId) setTowerBId(null);
  };

  const handleStartPlacingPin = (pinType) => {
    setPlacingPin(pinType);
  };

  const handlePinPlaced = () => {
    setPlacingPin(null);
  };

  const onClearPins = () => {
    setTowers([]);
    setPlacingPin(null);
    setLinkMode(false);
    setTowerAId(null);
    setTowerBId(null);
    setLinks([]);
    setFresnelData(null); // Also clear fresnel data
  };

  const handlePlanSaved = (plan) => {
    setCurrentPlanId(plan.id);
    onClearPins();
  };

  const handlePlanDeleted = (planId) => {
    if (planId === currentPlanId) {
      setCurrentPlanId(null);
      onClearPins();
    }
  };

  function handleCreateLink() {
    if (!towerAId || !towerBId) return;
    const a = towers.find((t) => t.id === towerAId);
    const b = towers.find((t) => t.id === towerBId);
    if (!a || !b) return;

    if (a.frequencyHz !== b.frequencyHz) {
      toast.error("Cannot create link: Tower frequencies don't match");
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
    setLinks((prev) => [...prev, newLink]);

    // Show toast notification
    toast.success("Link created successfully!");

    // Switch to links tab
    setActiveTab("links");

    // Reset selection for next link
    setTowerAId(null);
    setTowerBId(null);
  }

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
                linkMode={linkMode}
                towerAId={towerAId}
                towerBId={towerBId}
                onSelectTowerA={setTowerAId}
                onSelectTowerB={setTowerBId}
                fresnelData={fresnelData} // ✅ ADD THIS - pass fresnelData to MapProvider
              />

              <SidebarPanel
                title="RF Outdoor Link Planner"
                placingPin={placingPin}
                onStartPlacingPin={handleStartPlacingPin}
                onClearPins={onClearPins}
                onPlanSaved={handlePlanSaved}
                onPlanDeleted={handlePlanDeleted}
                towers={towers}
                links={links}
                onDeleteLink={handleDeleteLink}
                linkMode={linkMode}
                setLinkMode={setLinkMode}
                onDeleteTower={handleDeleteTower}
                towerAId={towerAId}
                towerBId={towerBId}
                onCreateLink={handleCreateLink}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onFresnelCalculated={handleFresnelCalculated} // ✅ This is correct
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
