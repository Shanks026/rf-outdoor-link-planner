import React, { useState } from "react";
import {
  Trash2,
  MoveLeft,
  Calculator,
  RadioTower,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import pinSvg from "../assets/LocationPin.svg";
import { ElevationService } from "../services/elevationService";
import { FresnelCalculator } from "../utils/fresnelCalculator";

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

export default function LinksSection({
  links,
  towers,
  onDeleteLink,
  setActiveTab,
  onFresnelCalculated, // New prop to pass fresnel data to map
}) {
  const [selectedLink, setSelectedLink] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [fresnelData, setFresnelData] = useState(null);
  const [clearanceResult, setClearanceResult] = useState(null);

  const handleCalculateFresnel = async (link) => {
    if (!link) return;

    const towerA = towers.find((t) => t.id === link.towerAId);
    const towerB = towers.find((t) => t.id === link.towerBId);

    if (!towerA || !towerB) return;

    setIsCalculating(true);
    try {
      // Get elevation profile
      const elevationProfile = await ElevationService.getElevationProfile(
        towerA.lat,
        towerA.lng,
        towerB.lat,
        towerB.lng,
        50 // number of sample points
      );

      console.log("Elevation profile:", elevationProfile);

      // Calculate Fresnel zone points
      const fresnelPoints = FresnelCalculator.calculateFresnelZonePoints(
        towerA,
        towerB,
        elevationProfile,
        link.frequencyHz
      );

      console.log("Fresnel points:", fresnelPoints);
      console.log("Number of fresnel points:", fresnelPoints.length);

      // Calculate clearance
      const clearance = FresnelCalculator.calculateLinkClearance(
        fresnelPoints,
        elevationProfile,
        towerA, // Add this
        towerB // Add this
      );

      const result = {
        linkId: link.id,
        towerA,
        towerB,
        fresnelPoints,
        elevationProfile,
        clearance,
      };

      setFresnelData(result);
      setClearanceResult(clearance);

      // Pass data to parent component for map visualization
      if (onFresnelCalculated) {
        onFresnelCalculated(result);
      }
    } catch (error) {
      console.error("Error calculating Fresnel zone:", error);
      alert("Failed to calculate Fresnel zone. Please try again.");
    } finally {
      setIsCalculating(false);
    }
  };

  // If a link is selected, show detailed view
  if (selectedLink) {
    const link = links.find((l) => l.id === selectedLink);
    const towerA = towers.find((t) => t.id === link.towerAId);
    const towerB = towers.find((t) => t.id === link.towerBId);

    if (!towerA || !towerB) {
      setSelectedLink(null);
      return null;
    }

    const distance = calculateDistanceKm(
      towerA.lat,
      towerA.lng,
      towerB.lat,
      towerB.lng
    ).toFixed(2);

    return (
      <div className="space-y-4">
        {/* Back Button */}
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={() => {
            setSelectedLink(null);
            setFresnelData(null);
            setClearanceResult(null);
          }}
        >
          <MoveLeft className="w-4 h-4" />
          <span>Back to Links</span>
        </button>

        <div className="flex justify-between items-center">
          <div className="text-sm font-semibold text-gray-800">
            {towerA.name || "Tower A"} - {towerB.name || "Tower B"}
          </div>
          <div className="text-gray-800 font-medium text-xs">
            Distance: {distance} km
          </div>
        </div>

        {/* Calculate Fresnel Button */}
        <Button
          className="w-full py-2 flex items-center justify-center gap-2"
          onClick={() => handleCalculateFresnel(link)}
          disabled={isCalculating}
        >
          <Calculator className="w-4 h-4" />
          {isCalculating ? "Calculating..." : "Calculate Fresnel Zone"}
        </Button>

        {/* Clearance Result */}
        {clearanceResult && (
          <div
            className={`p-3 rounded-lg border ${
              clearanceResult.isClear
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {clearanceResult.isClear ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  clearanceResult.isClear ? "text-green-800" : "text-yellow-800"
                }`}
              >
                {clearanceResult.isClear
                  ? "Good Clearance"
                  : "Potential Obstructions"}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div>
                Clearance: {clearanceResult.clearancePercentage.toFixed(1)}%
              </div>
              <div>
                Blocked points: {clearanceResult.blockedPoints}/
                {clearanceResult.totalPoints}
              </div>
              {clearanceResult.maxBlockage > 0 && (
                <div>
                  Max blockage: {clearanceResult.maxBlockage.toFixed(1)}m
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2 w-full">
          {" "}
          {/* Tower A Details */}
          <div className="space-y-2 w-full">
            <div className="flex items-start gap-2 p-2 rounded bg-gray-50">
              <img src={pinSvg} alt="Pin" className="w-5 h-5 mt-1" />
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {towerA.name || "Tower A"}
                </div>

                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  Freq: {(towerA.frequencyHz / 1e6).toFixed(0)} MHz
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  Height: {towerA.heightM} m
                </div>

                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Lat: {towerA.lat.toFixed(5)}, Long: {towerA.lng.toFixed(5)}
                </div>
              </div>
            </div>
          </div>
          {/* Tower B Details */}
          <div className="space-y-2 w-full">
            <div className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800">
              <img src={pinSvg} alt="Pin" className="w-5 h-5 mt-1" />
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {towerB.name || "Tower B"}
                </div>

                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  Freq: {(towerB.frequencyHz / 1e6).toFixed(0)} MHz
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  Height: {towerB.heightM} m
                </div>

                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Lat: {towerB.lat.toFixed(5)}, Long: {towerB.lng.toFixed(5)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {fresnelData && (
          <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded">
            <div>First Fresnel zone calculated</div>
            <div>
              Max radius:{" "}
              {Math.max(
                ...fresnelData.fresnelPoints.map((p) => p.fresnelRadius)
              ).toFixed(1)}
              m
            </div>
          </div>
        )}

        {/* Delete Link Button */}
        <Button
          variant="outline"
          className="w-full py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => {
            if (window.confirm("Are you sure you want to delete this link?")) {
              onDeleteLink(link.id);
              setSelectedLink(null);
            }
          }}
        >
          Delete Link
        </Button>
      </div>
    );
  }

  // Main links list view
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Links ({links.length})
        </div>

        {links.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-sm">Linked towers will appear here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => {
              const towerA = towers.find((t) => t.id === link.towerAId);
              const towerB = towers.find((t) => t.id === link.towerBId);
              if (!towerA || !towerB) return null;

              return (
                <div
                  key={link.id}
                  className="p-3 rounded-lg border flex items-start gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setSelectedLink(link.id)}
                >
                  <RadioTower className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                  <div className="flex items-start flex-col gap-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {towerA.name || "Tower A"} - {towerB.name || "Tower B"}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Frequency: {(link.frequencyHz / 1e6).toFixed(0)} MHz
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
