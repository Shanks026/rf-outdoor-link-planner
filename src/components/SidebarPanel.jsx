import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Link2,
  MoveLeft,
  Link,
  RadioTower,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import LinksSection from "./LinksSection";
import pinSvg from "../assets/LocationPin.svg";
import { toast } from "sonner";

const STORAGE_KEY = "rf_planner_projects_v1";

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects || []));
  } catch (e) {
    console.error("Failed to save projects", e);
  }
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function ConnectionSection({
  towers,
  linkMode,
  setLinkMode,
  towerAId,
  towerBId,
  onCreateLink,
  onBackToTowers,
  activeTab,
}) {
  const selectedTowerA = useMemo(
    () => towers.find((t) => t.id === towerAId) || null,
    [towers, towerAId]
  );
  const selectedTowerB = useMemo(
    () => towers.find((t) => t.id === towerBId) || null,
    [towers, towerBId]
  );

  const distanceKm = useMemo(() => {
    if (selectedTowerA && selectedTowerB) {
      return calculateDistanceKm(
        selectedTowerA.lat,
        selectedTowerA.lng,
        selectedTowerB.lat,
        selectedTowerB.lng
      ).toFixed(2);
    }
    return null;
  }, [selectedTowerA, selectedTowerB]);

  const canCreateLink = !!towerAId && !!towerBId;

  const hasFrequencyMismatch =
    selectedTowerA &&
    selectedTowerB &&
    selectedTowerA.frequencyHz !== selectedTowerB.frequencyHz;

  const handleCreateLinkClick = () => {
    if (!canCreateLink) return;

    if (hasFrequencyMismatch) {
      toast.error("Cannot create link: Tower frequencies don't match");
      return;
    }

    onCreateLink();
  };

  // Show instructions based on how we got here
  const getInstructions = () => {
    if (linkMode) {
      return "Select 2 towers to establish a connection";
    } else {
      return "Two towers selected - ready to create connection";
    }
  };

  return (
    <div className="space-y-4">
      {/* Only show back button if we came from Towers tab via Connect button */}
      {linkMode && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={onBackToTowers}
        >
          <MoveLeft className="w-4 h-4" />
          <span>Back to Towers</span>
        </button>
      )}

      <div className="text-xs text-gray-700 dark:text-gray-200">
        {getInstructions()}
      </div>

      {/* Selection status */}
      {towers.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-sm">Start placing pins to add towers</div>
        </div>
      )}
      {/* SVG representation */}
      <div className="w-full border border-gray-200 dark:border-gray-800 rounded-md flex items-center justify-between p-4">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`rounded-full p-1 ${
              selectedTowerA ? "text-black" : "text-gray-400"
            }`}
          >
            <img
              src={pinSvg}
              alt="Tower A"
              className={`w-6 h-6 ${
                selectedTowerA ? "filter-none" : "filter grayscale opacity-40"
              }`}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {selectedTowerA?.name || "Tower A"}
          </div>
        </div>

        <div className="flex-1 px-4">
          <div className="h-0.5 w-full border-t-2 border-dashed border-gray-400" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className={`rounded-full p-1 ${
              selectedTowerB ? "text-black" : "text-gray-400"
            }`}
          >
            <img
              src={pinSvg}
              alt="Tower B"
              className={`w-6 h-6 ${
                selectedTowerB ? "filter-none" : "filter grayscale opacity-40"
              }`}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {selectedTowerB?.name || "Tower B"}
          </div>
        </div>
      </div>

      {/* Selected towers details */}
      {(selectedTowerA || selectedTowerB) && (
        <div className="space-y-2 pt-2">
          {selectedTowerA && (
            <div className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800">
              <img src={pinSvg} alt="Pin" className="w-6 h-6" />
              <div className="w-full flex flex-col gap-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {selectedTowerA.name || "Tower A"}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Freq: {(selectedTowerA.frequencyHz / 1e6).toFixed(0)} MHz
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Height: {selectedTowerA.heightM} m
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Lat: {selectedTowerA.lat.toFixed(5)}, Long:{" "}
                  {selectedTowerA.lng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {selectedTowerB && (
            <div className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800">
              <img src={pinSvg} alt="Pin" className="w-6 h-6" />
              <div className="w-full flex flex-col gap-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {selectedTowerB.name || "Tower B"}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Freq: {(selectedTowerB.frequencyHz / 1e6).toFixed(0)} MHz
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Height: {selectedTowerB.heightM} m
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Lat: {selectedTowerB.lat.toFixed(5)}, Long:{" "}
                  {selectedTowerB.lng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {canCreateLink && distanceKm && (
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 text-center pt-2">
              Distance: {distanceKm} Km
            </div>
          )}

          {/* Frequency mismatch warning */}
          {hasFrequencyMismatch && (
            <div className="p-2 rounded bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                Frequency Mismatch
              </div>
              <div className="text-[11px] text-yellow-700 dark:text-yellow-300">
                Tower A: {(selectedTowerA.frequencyHz / 1e6).toFixed(0)} MHz ≠
                Tower B: {(selectedTowerB.frequencyHz / 1e6).toFixed(0)} MHz
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full py-2"
        disabled={!canCreateLink || hasFrequencyMismatch}
        onClick={handleCreateLinkClick}
      >
        {hasFrequencyMismatch ? "Frequencies Don't Match" : "Create Link"}
      </Button>

      {/* {(towerAId || towerBId) && (
        <Button
          variant="outline"
          className="w-full py-2"
          onClick={() => {
            onSelectTowerA(null);
            onSelectTowerB(null);
          }}
        >
          Clear Selection
        </Button>
      )} */}
    </div>
  );
}

// Towers Section Component
function TowersSection({
  towers,
  placingPin,
  onPlacePins,
  onConnectTowers,
  onDeleteTower,
  onClearPins,
}) {
  const canConnect = towers.length >= 2;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          onClick={onPlacePins}
          className="w-full py-2"
          disabled={!!placingPin}
        >
          Place pins
        </Button>
      </div>

      <Button
        onClick={onConnectTowers}
        className="w-full py-2 flex items-center justify-center gap-2"
        disabled={!canConnect}
        variant="outline"
      >
        <Link2 className="w-4 h-4" />
        Connect towers
      </Button>

      <div className="space-y-2 pt-2">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Pins ({towers.length})
        </div>

        {towers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-sm">Start placing pins to add towers</div>
          </div>
        )}

        {towers.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800"
          >
            <div className="flex items-start gap-2 flex-1">
              <img src={pinSvg} alt="Pin" className="w-4 h-4 mt-1" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {t.name || "Tower"}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Freq: {(t.frequencyHz / 1e6).toFixed(0)} MHz
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                    Height: {t.heightM} m
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Lat: {t.lat.toFixed(5)}, Long: {t.lng.toFixed(5)}
                </div>
              </div>
            </div>
            <button
              onClick={() => onDeleteTower(t.id)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-700"
              title="Delete tower"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {towers.length > 0 && (
          <button
            onClick={onClearPins}
            className="w-full text-xs px-2 py-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium mt-2"
          >
            Clear All Pins
          </button>
        )}
      </div>
    </div>
  );
}

export default function SidebarPanel({
  title = "Create Plan",
  width = "w-120",
  top = "top-6",
  right = "right-6",
  bottom = "bottom-6",
  onPlanSaved = () => {},
  onPlanDeleted = () => {},
  placingPin,
  onStartPlacingPin = () => {},
  onClearPins = () => {},
  towers,
  linkMode,
  setLinkMode,
  towerAId,
  towerBId,
  onCreateLink,
  links,
  onDeleteLink,
  onDeleteTower,
  onFresnelCalculated,
  activeTab = "towers",
  setActiveTab = () => {},
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planId, setPlanId] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [savedPlan, setSavedPlan] = useState(null);

  useEffect(() => {
    const projects = loadProjects();
    if (projects && projects.length > 0) {
      setSavedPlan(projects[projects.length - 1]);
    }
  }, []);

  function genId() {
    return `project-${Date.now()}`;
  }

  function startCreate() {
    setPlanId(genId());
    setCreatedAt(new Date().toISOString());
    setPlanName("");
    setIsCreating(true);
  }

  function cancelCreate() {
    setIsCreating(false);
    setPlanId(null);
    setCreatedAt(null);
    setPlanName("");
  }

  function handleSave() {
    const name =
      planName && String(planName).trim().length
        ? String(planName).trim()
        : "Untitled Plan";
    const project = {
      id: planId || genId(),
      name,
      createdAt: createdAt || new Date().toISOString(),
      meta: {},
      towers: [],
      links: [],
    };

    const projects = loadProjects();
    projects.push(project);
    saveProjects(projects);

    setSavedPlan(project);
    setIsCreating(false);
    setPlanId(null);
    setCreatedAt(null);
    setPlanName("");

    try {
      onPlanSaved(project);
    } catch (e) {
      console.error("onPlanSaved callback error", e);
    }
  }

  function handleDelete(projectId) {
    const all = loadProjects();
    const remaining = all.filter((p) => p.id !== projectId);
    saveProjects(remaining);
    setSavedPlan(null);
    onClearPins();
    try {
      onPlanDeleted(planId);
    } catch (e) {
      console.error("onPlanDeleted callback error", e);
    }
  }

  const handleDeleteTowerLocal = (towerId) => {
    if (typeof onDeleteTower === "function") {
      onDeleteTower(towerId);
    }
  };

  function handleDeleteLinkLocal(linkId) {
    if (typeof onDeleteLink === "function") {
      onDeleteLink(linkId);
    }
  }

  const handlePlacePins = () => {
    onStartPlacingPin("MULTI");
  };

  const handleConnectTowers = () => {
    setLinkMode(true);
    setActiveTab("connection"); // Move to connection tab
  };

  const handleBackToTowers = () => {
    setLinkMode(false);
    setActiveTab("towers");
  };

  return (
    <aside
      aria-label={title}
      className={`fixed ${top} ${right} ${bottom} z-50 ${width} bg-white/95 dark:bg-slate-900/90 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg`}
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Scale, analyse Fresnel polygons
          </p>
        </div>
        {savedPlan ? (
          <button
            aria-label="Create new plan"
            title="Create new plan"
            onClick={startCreate}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-gray-700 dark:text-gray-200" />
          </button>
        ) : null}
      </div>

      <div
        className="px-4 py-3 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 96px)" }}
      >
        {!savedPlan ? (
          <>
            {!isCreating ? (
              <div className="mb-4">
                <Button
                  onClick={startCreate}
                  className="w-full py-2 bg-gray-800 text-white text-sm"
                >
                  Create Plan
                </Button>
                <div className="text-center mt-12 text-xs text-gray-500 dark:text-gray-400">
                  Create a plan to start calculating Fresnel zones
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Plan name
                  </Label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Enter plan name"
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={cancelCreate}
                    variant="outline"
                    className="w-[49%]"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="w-[49%]">
                    Save
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between dark:bg-slate-800">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {savedPlan.name}
              </div>
              <button
                aria-label="Delete plan"
                title="Delete plan"
                onClick={() => handleDelete(savedPlan.id)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </button>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="towers" className="flex items-center gap-2">
                  <RadioTower className="w-4 h-4" />
                  Towers
                </TabsTrigger>
                <TabsTrigger
                  value="connection"
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Connection
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Links ({links.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="towers" className="mt-4">
                <TowersSection
                  towers={towers}
                  placingPin={placingPin}
                  onPlacePins={handlePlacePins}
                  onConnectTowers={handleConnectTowers}
                  onDeleteTower={handleDeleteTowerLocal}
                  onClearPins={onClearPins}
                />
              </TabsContent>

              <TabsContent value="connection" className="mt-4">
                <ConnectionSection
                  towers={towers}
                  linkMode={linkMode}
                  setLinkMode={setLinkMode}
                  towerAId={towerAId}
                  towerBId={towerBId}
                  onCreateLink={onCreateLink}
                  onBackToTowers={handleBackToTowers}
                  activeTab={activeTab}
                />
              </TabsContent>

              <TabsContent value="links" className="mt-4">
                <LinksSection
                  links={links}
                  towers={towers}
                  onDeleteLink={handleDeleteLinkLocal}
                  setActiveTab={setActiveTab}
                  onFresnelCalculated={onFresnelCalculated}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </aside>
  );
}
