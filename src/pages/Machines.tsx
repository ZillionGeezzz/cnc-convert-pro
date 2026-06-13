import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MinimalHeader } from "@/components/MinimalHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type MachineDefinition,
  type MachineType,
  type MachineManufacturer,
  getMachines,
  getManufacturers,
  MACHINE_TYPE_LABELS,
  SPINDLE_TAPER_LABELS,
} from "@/lib/cnc/machine-library";
import {
  Search,
  Move,
  Ruler,
  Gauge,
  Crosshair,
  Package,
  ChevronDown,
  Dot,
  Monitor,
  Columns3,
  ArrowUpDown,
} from "lucide-react";

type SortKey = "manufacturer" | "x-travel" | "max-rpm" | "power" | "weight";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "x-travel", label: "X Travel (largest)" },
  { value: "max-rpm", label: "Max RPM (highest)" },
  { value: "power", label: "Spindle Power (highest)" },
  { value: "weight", label: "Machine Weight (heaviest)" },
];

function formatPower(power: { kW: number; hp?: number }): string {
  if (power.hp) return `${power.kW} kW (${power.hp} hp)`;
  return `${power.kW} kW`;
}

function formatTorque(torque: { Nm: number; ftLbs?: number }): string {
  if (torque.ftLbs) return `${torque.Nm} Nm (${torque.ftLbs} ft·lb)`;
  return `${torque.Nm} Nm`;
}

function formatTravel(mm: number): string {
  return `${mm} mm`;
}

function formatAccuracy(acc: MachineDefinition["accuracy"]): string {
  if (acc.positioning?.mm) return `${acc.positioning.mm} mm`;
  if (acc.positioning?.meters) return `${acc.positioning.meters * 1000} mm/m`;
  return "—";
}

function formatRepeatability(acc: MachineDefinition["accuracy"]): string {
  if (acc.repeatability?.mm) return `${acc.repeatability.mm} mm`;
  if (acc.repeatability?.meters) return `${acc.repeatability.meters * 1000} mm`;
  return "—";
}

export default function Machines() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MachineType | "all">("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<MachineManufacturer | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("manufacturer");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMachines = useMemo(() => getMachines(), []);
  const manufacturers = useMemo(() => getManufacturers(), []);

  const filteredMachines = useMemo(() => {
    let result = [...allMachines];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.model.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }

    // Manufacturer filter
    if (manufacturerFilter !== "all") {
      result = result.filter((m) => m.manufacturer === manufacturerFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "manufacturer":
          return a.manufacturer.localeCompare(b.manufacturer) || a.model.localeCompare(b.model);
        case "x-travel":
          return b.travels.x - a.travels.x;
        case "max-rpm":
          return b.spindle.maxRPM - a.spindle.maxRPM;
        case "power":
          return b.spindle.power.kW - a.spindle.power.kW;
        case "weight":
          return b.weight - a.weight;
        default:
          return 0;
      }
    });

    return result;
  }, [allMachines, search, typeFilter, manufacturerFilter, sortBy]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const vmCount = useMemo(
    () => allMachines.filter((m) => m.type === "vmc").length,
    [allMachines],
  );
  const hmCount = useMemo(
    () => allMachines.filter((m) => m.type === "hmc").length,
    [allMachines],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <MinimalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-medium text-foreground">Machine Reference</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {allMachines.length} machines —
                <span className="ml-1">
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{vmCount}</span> VMC
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{hmCount}</span> HMC
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
        >
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as MachineType | "all")}
            >
              <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vmc">VMC</SelectItem>
                <SelectItem value="hmc">HMC</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={manufacturerFilter}
              onValueChange={(v) =>
                setManufacturerFilter(v as MachineManufacturer | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-44 h-8 text-sm">
                <SelectValue placeholder="All manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map((mfr) => (
                  <SelectItem key={mfr} value={mfr}>
                    {mfr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortKey)}
            >
              <SelectTrigger className="w-full sm:w-52 h-8 text-sm">
                <ArrowUpDown className="w-3 h-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="mb-4 text-xs text-muted-foreground"
        >
          {filteredMachines.length === 0
            ? "No machines match your filters."
            : `Showing ${filteredMachines.length} of ${allMachines.length} machines`}
        </motion.div>

        {/* Machine cards */}
        <div className="space-y-2">
          {filteredMachines.map((machine, index) => {
            const isExpanded = expandedId === machine.id;
            return (
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.01 * index }}
              >
                {/* Card header (always visible) */}
                <button
                  onClick={() => toggleExpand(machine.id)}
                  className={cn(
                    "w-full text-left border border-border rounded-lg transition-all group",
                    isExpanded
                      ? "rounded-b-none border-b-0 bg-zinc-50 dark:bg-zinc-900/50"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                  )}
                >
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                          machine.type === "vmc"
                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {machine.type === "vmc" ? (
                          <Monitor className="w-4 h-4" />
                        ) : (
                          <Columns3 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {machine.manufacturer}
                          </span>
                          <span className="text-sm text-foreground/70">
                            {machine.model}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 font-mono",
                              machine.type === "vmc"
                                ? "border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {machine.type === "vmc" ? "VMC" : "HMC"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {machine.description}
                        </p>
                        {/* Quick specs row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Move className="w-3 h-3" />
                            {formatTravel(machine.travels.x)} × {formatTravel(machine.travels.y)} × {formatTravel(machine.travels.z)}
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            {machine.spindle.maxRPM.toLocaleString()} RPM
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            {machine.spindle.taper}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {/* Expanded detail section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border border-border border-t-0 rounded-b-lg bg-zinc-50/50 dark:bg-zinc-900/30 p-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
                          {/* TRAVELS */}
                          <SpecSection
                            title="Travels"
                            icon={<Move className="w-3.5 h-3.5" />}
                            color="text-blue-500"
                          >
                            <SpecRow label="X Axis" value={formatTravel(machine.travels.x)} />
                            <SpecRow label="Y Axis" value={formatTravel(machine.travels.y)} />
                            <SpecRow label="Z Axis" value={formatTravel(machine.travels.z)} />
                            {machine.travels.b !== undefined && (
                              <SpecRow label="B Axis" value={`${machine.travels.b}°`} />
                            )}
                            <SpecRow
                              label="Rapids"
                              value={`${machine.rapids.x} / ${machine.rapids.y} / ${machine.rapids.z} m/min`}
                            />
                            {machine.rapids.b !== undefined && (
                              <SpecRow label="B Rapid" value={`${machine.rapids.b} rpm`} />
                            )}
                          </SpecSection>

                          {/* TABLE */}
                          <SpecSection
                            title="Table"
                            icon={<Package className="w-3.5 h-3.5" />}
                            color="text-emerald-500"
                          >
                            <SpecRow
                              label="Size"
                              value={`${machine.table.length} × ${machine.table.width} mm`}
                            />
                            {machine.table.palletSize &&
                              machine.type === "hmc" && (
                                <SpecRow label="Pallet" value={machine.table.palletSize} />
                              )}
                            {machine.table.palletChangeTime && (
                              <SpecRow
                                label="Pallet Change"
                                value={`${machine.table.palletChangeTime}s`}
                              />
                            )}
                            <SpecRow
                              label="Max Load"
                              value={`${machine.table.maxLoad.toLocaleString()} kg`}
                            />
                            {machine.table.tSlotCount && (
                              <SpecRow
                                label="T-Slots"
                                value={`${machine.table.tSlotCount}× ${machine.table.tSlotSize}`}
                              />
                            )}
                          </SpecSection>

                          {/* SPINDLE */}
                          <SpecSection
                            title="Spindle"
                            icon={<Gauge className="w-3.5 h-3.5" />}
                            color="text-violet-500"
                          >
                            <SpecRow
                              label="Max RPM"
                              value={`${machine.spindle.maxRPM.toLocaleString()}`}
                            />
                            <SpecRow label="Taper" value={SPINDLE_TAPER_LABELS[machine.spindle.taper]} />
                            <SpecRow label="Power" value={formatPower(machine.spindle.power)} />
                            <SpecRow label="Torque" value={formatTorque(machine.spindle.torque)} />
                            {machine.spindle.driveType && (
                              <SpecRow
                                label="Drive"
                                value={machine.spindle.driveType.replace("-", " ")}
                                capitalize
                              />
                            )}
                            {machine.spindle.cooling && (
                              <SpecRow
                                label="Cooling"
                                value={machine.spindle.cooling}
                                capitalize
                              />
                            )}
                          </SpecSection>

                          {/* ACCURACY & TOOLING */}
                          <SpecSection
                            title="Accuracy & Tooling"
                            icon={<Crosshair className="w-3.5 h-3.5" />}
                            color="text-rose-500"
                          >
                            <SpecRow
                              label="Positioning"
                              value={formatAccuracy(machine.accuracy)}
                            />
                            <SpecRow
                              label="Repeatability"
                              value={formatRepeatability(machine.accuracy)}
                            />
                            <SpecRow label="Standard" value={machine.accuracy.standard || "—"} />
                            <Separator className="my-1.5" />
                            <SpecRow
                              label="Tool Capacity"
                              value={`${machine.toolMagazine.capacity} tools`}
                            />
                            {machine.toolMagazine.maxToolDiameter && (
                              <SpecRow
                                label="Max Ø"
                                value={`${machine.toolMagazine.maxToolDiameter} mm`}
                              />
                            )}
                            {machine.toolMagazine.maxToolLength && (
                              <SpecRow
                                label="Max Length"
                                value={`${machine.toolMagazine.maxToolLength} mm`}
                              />
                            )}
                            {machine.rapids.maxChipToChip && (
                              <SpecRow
                                label="Chip-to-Chip"
                                value={`${machine.rapids.maxChipToChip}s`}
                              />
                            )}
                            <SpecRow
                              label="Machine Weight"
                              value={`${(machine.weight / 1000).toFixed(1)} t`}
                            />
                          </SpecSection>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredMachines.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No machines match your search criteria.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setManufacturerFilter("all");
                }}
                className="mt-3 text-xs"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// Helper sub-components
// ==========================================

function SpecSection({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SpecRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-[11px] font-medium text-foreground text-right leading-snug",
          capitalize && "capitalize",
        )}
      >
        {value}
      </span>
    </div>
  );
}
