import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import pinSvg from "../assets/LocationPin.svg";

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

export default function SidebarPanel({
  title = "Create Plan",
  width = "w-80",
  top = "top-6",
  right = "right-6",
  bottom = "bottom-6",
  onPlanSaved = () => {},
  onPlanDeleted = () => {},
  pinA,
  pinB,
  placingPin,
  onStartPlacingPin = () => {},
  onClearPinA = () => {},
  onClearPinB = () => {},
  onClearPins = () => {},
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
      onPlanDeleted(projectId);
    } catch (e) {
      console.error("onPlanDeleted callback error", e);
    }
  }

  function handlePlacePinClick() {
    if (!pinA) {
      onStartPlacingPin("A");
      return;
    }
    if (pinA && !pinB) {
      onStartPlacingPin("B");
      return;
    }
  }

  function primaryButtonLabel() {
    if (!pinA) return "Place Pin — Tower A";
    if (pinA && !pinB) return "Place Pin — Tower B";
    return "Both pins placed";
  }

  const bothPlaced = !!pinA && !!pinB;

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
                  className="w-full py-2 rounded-full bg-gray-800 text-white text-sm"
                >
                  Create Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
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

            <div className="w-full h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 border border-gray-200 dark:border-gray-800 rounded-md flex items-center justify-between px-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`${
                    pinA ? "bg-white" : "bg-gray-300"
                  } rounded-full p-1 shadow-sm`}
                >
                  <img src={pinSvg} alt="Pin A" className="w-6 h-6" />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Pin 1
                </div>
              </div>
              <div className="flex-1 px-4">
                <div className="h-0.5 w-full border-t-2 border-dashed border-gray-400" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`${
                    pinB ? "bg-white" : "bg-gray-300"
                  } rounded-full p-1 shadow-sm`}
                >
                  <img src={pinSvg} alt="Pin B" className="w-6 h-6" />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Pin 2
                </div>
              </div>
            </div>

            {!bothPlaced && (
              <div>
                <Button
                  onClick={handlePlacePinClick}
                  className="w-full py-2 mt-2"
                  disabled={placingPin !== null}
                >
                  {primaryButtonLabel()}
                </Button>
                {placingPin && (
                  <div className="mt-2 text-xs text-center text-blue-600 dark:text-blue-400 font-medium">
                    Click on the map to place Tower {placingPin}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Pins status
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-slate-800">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Tower A
                  </div>
                  <div className="text-sm">
                    {pinA
                      ? `Placed — ${pinA.lat.toFixed(5)}, ${pinA.lng.toFixed(
                          5
                        )}`
                      : "Not placed"}
                  </div>
                </div>
                {pinA && (
                  <button
                    onClick={onClearPinA}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-slate-800">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Tower B
                  </div>
                  <div className="text-sm">
                    {pinB
                      ? `Placed — ${pinB.lat.toFixed(5)}, ${pinB.lng.toFixed(
                          5
                        )}`
                      : "Not placed"}
                  </div>
                </div>
                {pinB && (
                  <button
                    onClick={onClearPinB}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Clear
                  </button>
                )}
              </div>

              {(pinA || pinB) && (
                <button
                  onClick={onClearPins}
                  className="w-full text-xs px-2 py-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium mt-2"
                >
                  Clear All Pins
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
