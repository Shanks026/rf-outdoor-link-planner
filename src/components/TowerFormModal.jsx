// src/components/TowerFormModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

/**
 * TowerFormModal
 *
 * Props:
 * - position: { lat, lng }  (required) — modal is shown when position is provided
 * - onClose: function()      (required) — called when modal is dismissed
 * - onSave: function(data)   (required) — called with { name, frequencyHz, heightM }
 *
 * Behavior:
 * - shows default values for name (auto) and height (20m)
 * - frequency is entered as number + unit selector (GHz / MHz / Hz)
 * - onSave converts to Hz and returns payload
 */

export default function TowerFormModal({ position, onClose, onSave }) {
  // show modal when position exists
  const [open, setOpen] = useState(Boolean(position));

  // form state
  const [name, setName] = useState("");
  const [freqValue, setFreqValue] = useState("");
  const [freqUnit, setFreqUnit] = useState("GHz");
  const [heightM, setHeightM] = useState(20);

  // validation state
  const [errors, setErrors] = useState({ freq: "", name: "" });

  // when position changes (new click), reset & open
  useEffect(() => {
    setOpen(Boolean(position));
    if (position) {
      const autoName = `T-${String(Date.now()).slice(-6)}`;
      setName(autoName);
      setFreqValue(""); // user must enter frequency
      setFreqUnit("GHz");
      setHeightM(20);
      setErrors({ freq: "", name: "" });
    }
  }, [position]);

  function closeModal() {
    setOpen(false);
    // small timeout to allow dialog to animate closed before parent unmounts it
    // but do not rely on it — parent should remove modal (MapProvider sets pendingPos null in onClose)
    if (typeof onClose === "function") onClose();
  }

  function parseFrequencyHz(value, unit) {
    if (value === "" || value == null) return NaN;
    // allow values like "5", "5.0", etc.
    const v = Number(String(value).trim());
    if (!Number.isFinite(v)) return NaN;
    switch (unit) {
      case "GHz":
        return v * 1e9;
      case "MHz":
        return v * 1e6;
      case "Hz":
        return v;
      default:
        return NaN;
    }
  }

  function handleSave(e) {
    e?.preventDefault?.();

    const freqHz = parseFrequencyHz(freqValue, freqUnit);
    const newErrors = { freq: "", name: "" };

    if (!name || String(name).trim().length < 1) {
      newErrors.name = "Enter a name for this tower.";
    }

    if (!Number.isFinite(freqHz) || freqHz <= 0) {
      newErrors.freq = "Enter a valid positive frequency.";
    }

    setErrors(newErrors);

    // stop if errors
    if (newErrors.name || newErrors.freq) return;

    const payload = {
      name: String(name).trim(),
      frequencyHz: freqHz,
      heightM: Number(heightM) || 0,
      lat: position?.lat,
      lng: position?.lng,
    };

    if (typeof onSave === "function") {
      onSave(payload);
    }

    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeModal(); setOpen(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tower</DialogTitle>
          <DialogDescription>
            Add a tower at {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "selected location"}.
            Provide a name, frequency and height.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1">
            <Label htmlFor="tower-name">Name</Label>
            <Input
              id="tower-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tower name (e.g. Site-A)"
            />
            {errors.name && <p className="text-sm text-destructive-foreground text-red-600">{errors.name}</p>}
          </div>

          {/* Frequency */}
          <div className="grid gap-1">
            <Label htmlFor="freq">Frequency</Label>
            <div className="flex gap-2">
              <Input
                id="freq"
                value={freqValue}
                onChange={(e) => setFreqValue(e.target.value)}
                placeholder="e.g. 5"
                inputMode="decimal"
              />
              <Select value={freqUnit} onValueChange={(v) => setFreqUnit(v)} className="w-32">
                <SelectTrigger aria-label="Frequency unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHz">GHz</SelectItem>
                  <SelectItem value="MHz">MHz</SelectItem>
                  <SelectItem value="Hz">Hz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the numeric value and choose unit. Example: <span className="font-medium">5 GHz</span>.
            </p>
            {errors.freq && <p className="text-sm text-red-600">{errors.freq}</p>}
          </div>

          {/* Height */}
          <div className="grid gap-1">
            <Label htmlFor="height">Antenna Height (meters)</Label>
            <Input
              id="height"
              value={heightM}
              onChange={(e) => setHeightM(e.target.value)}
              placeholder="e.g. 20"
              inputMode="numeric"
            />
            <p className="text-xs text-muted-foreground">Enter antenna height in meters (optional)</p>
          </div>

          {/* Controls */}
          <DialogFooter className="pt-2">
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">Save Tower</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
