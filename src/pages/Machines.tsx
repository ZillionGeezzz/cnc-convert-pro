import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MinimalHeader } from "@/components/MinimalHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type MachineProfile,
  createDefaultMachineProfile,
} from "@/lib/cnc/types";
import { Monitor, Columns3, Save } from "lucide-react";

export default function Machines() {
  const [profile, setProfile] = useState<MachineProfile>(
    createDefaultMachineProfile,
  );

  const update = useCallback(<K extends keyof MachineProfile>(
    key: K,
    value: MachineProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    // For now, just log — this will wire into the converter in a future step
    console.log("Machine profile saved:", profile);
  }, [profile]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <MinimalHeader />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-lg font-medium text-foreground">
            Machine Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define the machine you're programming for — the converter will use
            these specs for smarter conversions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Machine type */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Machine Type
            </Label>
            <div className="flex gap-3">
              {(["vmc", "hmc"] as const).map((type) => {
                const Icon = type === "vmc" ? Monitor : Columns3;
                const isActive = profile.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => update("type", type)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all flex-1",
                      isActive
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-zinc-300 dark:hover:border-zinc-700",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {type === "vmc" ? "VMC" : "HMC"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Travels */}
          <fieldset className="border border-border rounded-lg p-4 space-y-4">
            <legend className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5">
              Travels (mm)
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">X Travel</Label>
                <Input
                  type="number"
                  value={profile.xTravel || ""}
                  onChange={(e) => update("xTravel", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Y Travel</Label>
                <Input
                  type="number"
                  value={profile.yTravel || ""}
                  onChange={(e) => update("yTravel", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Z Travel</Label>
                <Input
                  type="number"
                  value={profile.zTravel || ""}
                  onChange={(e) => update("zTravel", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </fieldset>

          {/* Table */}
          <fieldset className="border border-border rounded-lg p-4 space-y-4">
            <legend className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5">
              Table (mm)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Length</Label>
                <Input
                  type="number"
                  value={profile.tableLength || ""}
                  onChange={(e) => update("tableLength", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={profile.tableWidth || ""}
                  onChange={(e) => update("tableWidth", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </fieldset>

          {/* B-Axis */}
          <fieldset className="border border-border rounded-lg p-4 space-y-4">
            <legend className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5">
              B-Axis (Rotary)
            </legend>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">
                  Has B-Axis
                </Label>
                <Select
                  value={profile.bAxis ? "true" : "false"}
                  onValueChange={(v) => {
                    update("bAxis", v === "true");
                    if (v === "false") update("bAxisIncremental", true);
                  }}
                >
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {profile.bAxis && (
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground shrink-0">
                    Programming Mode
                  </Label>
                  <Select
                    value={profile.bAxisIncremental ? "incremental" : "absolute"}
                    onValueChange={(v) =>
                      update("bAxisIncremental", v === "incremental")
                    }
                  >
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incremental">Incremental (G91)</SelectItem>
                      <SelectItem value="absolute">Absolute (G90)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </fieldset>

          {/* Spindle */}
          <fieldset className="border border-border rounded-lg p-4 space-y-4">
            <legend className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5">
              Spindle
            </legend>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Max Spindle Speed (RPM)
                </Label>
                <Input
                  type="number"
                  value={profile.maxSpindleRPM || ""}
                  onChange={(e) =>
                    update("maxSpindleRPM", Number(e.target.value))
                  }
                  className="h-8 text-sm max-w-[200px]"
                />
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              className="h-8 text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfile(createDefaultMachineProfile())}
              className="h-8 text-xs text-muted-foreground"
            >
              Reset to Defaults
            </Button>
          </div>

          {/* Summary preview */}
          <div className="border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Current Profile Summary
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <Spec label="Type" value={profile.type === "vmc" ? "VMC" : "HMC"} />
              <Spec label="Travels" value={`${profile.xTravel} × ${profile.yTravel} × ${profile.zTravel} mm`} />
              <Spec label="Table" value={`${profile.tableLength} × ${profile.tableWidth} mm`} />
              <Spec
                label="B-Axis"
                value={
                  profile.bAxis
                    ? `Yes (${profile.bAxisIncremental ? "Incremental" : "Absolute"})`
                    : "None"
                }
              />
              <Spec label="Max RPM" value={profile.maxSpindleRPM.toLocaleString()} />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
