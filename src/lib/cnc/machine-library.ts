/**
 * VMC & HMC Machine Reference Database
 *
 * Comprehensive specifications for vertical and horizontal machining centers
 * from major manufacturers. Specs represent typical or base-model configurations
 * and may vary by year, options, and regional configuration.
 *
 * Sources: Manufacturer datasheets, IMTS publications, industry standards
 */

export type MachineType = "vmc" | "hmc";

export type SpindleTaper =
  | "BT30"
  | "BT40"
  | "BT50"
  | "CAT40"
  | "CAT50"
  | "HSK-A40"
  | "HSK-A63"
  | "HSK-A80"
  | "HSK-A100"
  | "HSK-T63"
  | "ISO40"
  | "ISO50";

export type MachineManufacturer =
  | "Haas Automation"
  | "Mazak"
  | "DMG MORI"
  | "Okuma"
  | "Makino"
  | "Brother"
  | "DN Solutions"
  | "Matsuura"
  | "Sodick"
  | "Yamazaki Mazak"
  | "Mitsubishi Heavy Industries"
  | "Toyoda";

export interface TravelSpecs {
  x: number; // mm
  y: number; // mm
  z: number; // mm
  b?: number; // deg (for HMC rotary axes)
}

export interface TableSpecs {
  length: number; // mm (table length / pallet length)
  width: number; // mm (table width / pallet width)
  maxLoad: number; // kg
  tSlotSize?: string; // e.g. "18H8"
  tSlotPitch?: number; // mm
  tSlotCount?: number;
  palletSize?: string; // for HMCs
  palletChangeTime?: number; // seconds
}

export interface SpindleSpecs {
  maxRPM: number;
  taper: SpindleTaper;
  power: {
    kW: number;
    hp?: number;
  };
  torque: {
    Nm: number;
    ftLbs?: number;
  };
  driveType?: "direct" | "belt" | "built-in" | "gear";
  cooling?: "air" | "liquid" | "chiller";
}

export interface AccuracySpecs {
  positioning?: {
    mm?: number; // full stroke positioning accuracy (mm)
    meters?: number; // per meter
  };
  repeatability?: {
    mm?: number;
    meters?: number;
  };
  standard?: string; // e.g. "ISO 230-2", "VDI/DGQ 3441", "JIS B 6330"
}

export interface RapidsSpecs {
  x: number; // m/min
  y: number; // m/min
  z: number; // m/min
  b?: number; // rpm (for HMC rotary)
  maxChipToChip?: number; // seconds (tool change time)
}

export interface MachineDefinition {
  id: string;
  manufacturer: MachineManufacturer;
  model: string;
  type: MachineType;
  description: string;
  travels: TravelSpecs;
  table: TableSpecs;
  spindle: SpindleSpecs;
  accuracy: AccuracySpecs;
  rapids: RapidsSpecs;
  toolMagazine: {
    capacity: number; // number of tools
    maxToolDiameter?: number; // mm
    maxToolLength?: number; // mm
    maxToolWeight?: number; // kg
  };
  weight: number; // kg (machine weight)
  footprint?: {
    length: number; // mm
    width: number; // mm
  };
  yearIntroduced?: number;
  imageUrl?: string;
}

export const MACHINE_MANUFACTURERS: MachineManufacturer[] = [
  "Haas Automation",
  "Mazak",
  "DMG MORI",
  "Okuma",
  "Makino",
  "Brother",
  "DN Solutions",
  "Matsuura",
  "Sodick",
  "Yamazaki Mazak",
  "Mitsubishi Heavy Industries",
  "Toyoda",
];

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  vmc: "Vertical Machining Center",
  hmc: "Horizontal Machining Center",
};

export const SPINDLE_TAPER_LABELS: Record<SpindleTaper, string> = {
  BT30: "BT30",
  BT40: "BT40",
  BT50: "BT50",
  CAT40: "CAT40",
  CAT50: "CAT50",
  "HSK-A40": "HSK-A40",
  "HSK-A63": "HSK-A63",
  "HSK-A80": "HSK-A80",
  "HSK-A100": "HSK-A100",
  "HSK-T63": "HSK-T63 (Torque)",
  ISO40: "ISO40",
  ISO50: "ISO50",
};

const MACHINES: MachineDefinition[] = [
  // ==========================================
  // HAAS VMCs
  // ==========================================
  {
    id: "haas-vf-2",
    manufacturer: "Haas Automation",
    model: "VF-2",
    type: "vmc",
    description: "The most popular VMC in the world. The VF-2 is a mid-size vertical machining center with a proven track record in job shops and production environments.",
    travels: { x: 762, y: 406, z: 508 },
    table: { length: 914, width: 356, maxLoad: 1361, tSlotCount: 3, tSlotSize: "16mm @ 125mm" },
    spindle: { maxRPM: 8100, taper: "BT40", power: { kW: 22.4, hp: 30 }, torque: { Nm: 135, ftLbs: 99.6 }, driveType: "belt" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 25.4, y: 25.4, z: 25.4, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 20, maxToolDiameter: 89, maxToolLength: 330, maxToolWeight: 5.4 },
    weight: 3175,
    footprint: { length: 2700, width: 2400 },
    yearIntroduced: 1988,
  },
  {
    id: "haas-vf-4",
    manufacturer: "Haas Automation",
    model: "VF-4",
    type: "vmc",
    description: "Larger work cube than VF-2 with extended X-axis travel. Ideal for medium-sized parts and higher production volumes.",
    travels: { x: 1270, y: 508, z: 635 },
    table: { length: 1321, width: 457, maxLoad: 1814, tSlotCount: 5, tSlotSize: "16mm @ 125mm" },
    spindle: { maxRPM: 8100, taper: "BT40", power: { kW: 22.4, hp: 30 }, torque: { Nm: 135, ftLbs: 99.6 }, driveType: "belt" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 25.4, y: 25.4, z: 25.4, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 24, maxToolDiameter: 89, maxToolLength: 330, maxToolWeight: 5.4 },
    weight: 3629,
    footprint: { length: 3200, width: 2400 },
  },
  {
    id: "haas-vf-5",
    manufacturer: "Haas Automation",
    model: "VF-5",
    type: "vmc",
    description: "Large-frame VMC with extended X and Y travels. Built for larger workpieces with the same reliable BT40 spindle.",
    travels: { x: 1524, y: 660, z: 762 },
    table: { length: 1626, width: 660, maxLoad: 2268, tSlotCount: 5, tSlotSize: "16mm @ 125mm" },
    spindle: { maxRPM: 8100, taper: "CAT40", power: { kW: 22.4, hp: 30 }, torque: { Nm: 135, ftLbs: 99.6 }, driveType: "belt" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 18, y: 18, z: 18, maxChipToChip: 3.8 },
    toolMagazine: { capacity: 30, maxToolDiameter: 89, maxToolLength: 406, maxToolWeight: 5.4 },
    weight: 5666,
    footprint: { length: 3900, width: 2800 },
  },
  {
    id: "haas-vf-2ssyt",
    manufacturer: "Haas Automation",
    model: "VF-2SSYT",
    type: "vmc",
    description: "Super-speed VMC with 12,000 RPM spindle and Y-axis trunnion-ready configuration for 5-axis capability. High-speed machining center.",
    travels: { x: 762, y: 406, z: 508 },
    table: { length: 914, width: 356, maxLoad: 1361, tSlotCount: 3, tSlotSize: "16mm @ 125mm" },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 22.4, hp: 30 }, torque: { Nm: 122, ftLbs: 90 }, driveType: "direct" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 35.6, y: 35.6, z: 35.6, maxChipToChip: 2.8 },
    toolMagazine: { capacity: 30, maxToolDiameter: 76, maxToolLength: 330, maxToolWeight: 5.4 },
    weight: 3266,
    footprint: { length: 2700, width: 2400 },
  },

  // ==========================================
  // MAZAK VMCs (Vertical Center Nexus / VARIAXIS)
  // ==========================================
  {
    id: "mazak-vcn-530c",
    manufacturer: "Mazak",
    model: "VCN-530C",
    type: "vmc",
    description: "Vertical Center Nexus with rigid box-way construction. High metal removal rates with powerful 35 HP spindle. Ideal for heavy-duty cutting.",
    travels: { x: 1050, y: 530, z: 510 },
    table: { length: 1300, width: 550, maxLoad: 1200, tSlotCount: 5, tSlotSize: "18H8 @ 100mm" },
    spindle: { maxRPM: 10000, taper: "BT40", power: { kW: 26, hp: 35 }, torque: { Nm: 184, ftLbs: 136 }, driveType: "gear" },
    accuracy: { positioning: { meters: 0.006 }, repeatability: { meters: 0.003 }, standard: "VDI/DGQ 3441" },
    rapids: { x: 36, y: 36, z: 32, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 7000,
    footprint: { length: 2700, width: 3100 },
  },
  {
    id: "mazak-vcn-430a",
    manufacturer: "Mazak",
    model: "VCN-430A",
    type: "vmc",
    description: "Compact high-speed VMC with linear guideways on all axes. Excellent acceleration for rapid material removal in production environments.",
    travels: { x: 760, y: 430, z: 510 },
    table: { length: 900, width: 430, maxLoad: 600, tSlotCount: 3, tSlotSize: "18H8 @ 125mm" },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 18.5, hp: 25 }, torque: { Nm: 118, ftLbs: 87 }, driveType: "direct" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.002 }, standard: "VDI/DGQ 3441" },
    rapids: { x: 50, y: 50, z: 45, maxChipToChip: 2.5 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 5000,
    footprint: { length: 2250, width: 2600 },
  },
  {
    id: "mazak-variaxis-j-500",
    manufacturer: "Mazak",
    model: "VARIAXIS J-500",
    type: "vmc",
    description: "5-axis VMC with tilting rotary trunnion table. Compact footprint with full 5-axis simultaneous machining capability for complex parts.",
    travels: { x: 550, y: 550, z: 460 },
    table: { length: 630, width: 500, maxLoad: 300, tSlotCount: 4, tSlotSize: "14H8 @ 125mm" },
    spindle: { maxRPM: 15000, taper: "HSK-A63", power: { kW: 18.5, hp: 25 }, torque: { Nm: 73, ftLbs: 54 }, driveType: "built-in" },
    accuracy: { positioning: { meters: 0.004 }, repeatability: { meters: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, maxChipToChip: 3.0 },
    toolMagazine: { capacity: 40, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 6500,
    footprint: { length: 2800, width: 3100 },
    yearIntroduced: 2018,
  },

  // ==========================================
  // DMG MORI VMCs
  // ==========================================
  {
    id: "dmg-mori-cmx-1100",
    manufacturer: "DMG MORI",
    model: "CMX 1100 V",
    type: "vmc",
    description: "Entry-level VMC from the CMX series. Robust construction with a large work area and high rigidity. Excellent value for job shops.",
    travels: { x: 1100, y: 560, z: 510 },
    table: { length: 1300, width: 600, maxLoad: 1500, tSlotCount: 5, tSlotSize: "18H8 @ 125mm" },
    spindle: { maxRPM: 8000, taper: "BT40", power: { kW: 18, hp: 24 }, torque: { Nm: 140, ftLbs: 103 }, driveType: "belt" },
    accuracy: { positioning: { mm: 0.008 }, repeatability: { mm: 0.004 }, standard: "ISO 230-2" },
    rapids: { x: 30, y: 30, z: 24, maxChipToChip: 5.0 },
    toolMagazine: { capacity: 20, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 6000,
    footprint: { length: 3300, width: 2900 },
  },
  {
    id: "dmg-mori-dmu-65",
    manufacturer: "DMG MORI",
    model: "DMU 65 monoBLOCK",
    type: "vmc",
    description: "Universal 5-axis VMC with monoBLOCK construction. High precision for complex mold, die, and aerospace work with swivel rotary table.",
    travels: { x: 735, y: 650, z: 560 },
    table: { length: 700, width: 600, maxLoad: 800, tSlotCount: 5, tSlotSize: "18H8" },
    spindle: { maxRPM: 18000, taper: "HSK-A63", power: { kW: 25, hp: 34 }, torque: { Nm: 85, ftLbs: 63 }, driveType: "built-in" },
    accuracy: { positioning: { mm: 0.006 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 35, y: 35, z: 35, maxChipToChip: 4.0 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 8000,
    footprint: { length: 4100, width: 3400 },
    yearIntroduced: 2015,
  },
  {
    id: "dmg-mori-nvh-6500",
    manufacturer: "DMG MORI",
    model: "NVX 6500",
    type: "vmc",
    description: "High-performance vertical machining center with large travels and high-speed 12,000 RPM spindle. Designed for efficient production of medium to large parts.",
    travels: { x: 1300, y: 650, z: 610 },
    table: { length: 1420, width: 650, maxLoad: 2000, tSlotCount: 5, tSlotSize: "18H8 @ 125mm" },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 22, hp: 30 }, torque: { Nm: 150, ftLbs: 111 }, driveType: "direct" },
    accuracy: { positioning: { mm: 0.006 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 42, y: 42, z: 36, maxChipToChip: 3.2 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 400, maxToolWeight: 8 },
    weight: 9800,
    footprint: { length: 3600, width: 3300 },
  },

  // ==========================================
  // OKUMA VMCs
  // ==========================================
  {
    id: "okuma-mb-5000h",
    manufacturer: "Okuma",
    model: "MB-5000H",
    type: "hmc",
    description: "Horizontal machining center with high rigidity and thermal compensation. Okuma's Thermo-Friendly Concept ensures consistent accuracy through thermal displacement control.",
    travels: { x: 800, y: 700, z: 750, b: 360 },
    table: { length: 500, width: 500, maxLoad: 800, palletSize: "500×500", palletChangeTime: 12 },
    spindle: { maxRPM: 14000, taper: "HSK-A63", power: { kW: 30, hp: 40 }, torque: { Nm: 130, ftLbs: 96 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.004 }, repeatability: { mm: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 60, y: 60, z: 60, b: 20, maxChipToChip: 3.0 },
    toolMagazine: { capacity: 48, maxToolDiameter: 100, maxToolLength: 400, maxToolWeight: 12 },
    weight: 11000,
    footprint: { length: 3500, width: 4400 },
    yearIntroduced: 2016,
  },
  {
    id: "okuma-genos-m560v",
    manufacturer: "Okuma",
    model: "GENOS M560V",
    type: "vmc",
    description: "Best-selling VMC from Okuma, combining high-speed machining with rigid construction. The M560V delivers exceptional productivity for a wide range of materials.",
    travels: { x: 1050, y: 560, z: 460 },
    table: { length: 1300, width: 560, maxLoad: 1500, tSlotCount: 5, tSlotSize: "18H8 @ 125mm" },
    spindle: { maxRPM: 15000, taper: "BT40", power: { kW: 26, hp: 35 }, torque: { Nm: 142, ftLbs: 105 }, driveType: "direct", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 42, z: 36, maxChipToChip: 2.8 },
    toolMagazine: { capacity: 32, maxToolDiameter: 80, maxToolLength: 350, maxToolWeight: 8 },
    weight: 7000,
    footprint: { length: 3000, width: 2700 },
  },
  {
    id: "okuma-genos-m460ve",
    manufacturer: "Okuma",
    model: "GENOS M460V-5X",
    type: "vmc",
    description: "5-axis VMC with swivel-head trunnion design. Ideal for complex multi-sided machining in a single setup, with Okuma's intelligent control.",
    travels: { x: 760, y: 460, z: 460 },
    table: { length: 450, width: 400, maxLoad: 300, tSlotCount: 4, tSlotSize: "14H8" },
    spindle: { maxRPM: 20000, taper: "HSK-A63", power: { kW: 30, hp: 40 }, torque: { Nm: 100, ftLbs: 74 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.004 }, repeatability: { mm: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 40, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 7500,
    footprint: { length: 3200, width: 3200 },
    yearIntroduced: 2019,
  },

  // ==========================================
  // MAKINO VMCs & HMCs
  // ==========================================
  {
    id: "makino-f5",
    manufacturer: "Makino",
    model: "F5",
    type: "vmc",
    description: "High-speed vertical machining center with professional 6-spindle. Advanced spindle technology for superior surface finishes and high metal removal rates.",
    travels: { x: 1050, y: 600, z: 510 },
    table: { length: 1200, width: 600, maxLoad: 1200, tSlotCount: 4, tSlotSize: "18H8 @ 125mm" },
    spindle: { maxRPM: 15000, taper: "HSK-A63", power: { kW: 26, hp: 35 }, torque: { Nm: 95, ftLbs: 70 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.003 }, repeatability: { mm: 0.0015 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 40, maxChipToChip: 2.5 },
    toolMagazine: { capacity: 40, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 8500,
    footprint: { length: 3300, width: 3100 },
    yearIntroduced: 2017,
  },
  {
    id: "makino-ps105",
    manufacturer: "Makino",
    model: "PS105",
    type: "vmc",
    description: "Entry-level production VMC with core Makino precision. Designed for high-volume production with reliable performance and low cost of ownership.",
    travels: { x: 1050, y: 550, z: 510 },
    table: { length: 1200, width: 550, maxLoad: 1500, tSlotCount: 5, tSlotSize: "18H8 @ 100mm" },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 18.5, hp: 25 }, torque: { Nm: 118, ftLbs: 87 }, driveType: "direct" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 36, y: 36, z: 30, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 7000,
    footprint: { length: 3200, width: 2900 },
  },
  {
    id: "makino-a500z",
    manufacturer: "Makino",
    model: "a500Z",
    type: "hmc",
    description: "5-axis horizontal machining center with tilting spindle. Core technology for aerospace and die/mold. Offers 5-axis capability in an HMC platform.",
    travels: { x: 800, y: 730, z: 1000, b: 360 },
    table: { length: 500, width: 500, maxLoad: 800, palletSize: "500×500", palletChangeTime: 10 },
    spindle: { maxRPM: 20000, taper: "HSK-A63", power: { kW: 40, hp: 54 }, torque: { Nm: 120, ftLbs: 89 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.003 }, repeatability: { mm: 0.001 }, standard: "ISO 230-2" },
    rapids: { x: 60, y: 60, z: 60, b: 30, maxChipToChip: 3.0 },
    toolMagazine: { capacity: 80, maxToolDiameter: 100, maxToolLength: 400, maxToolWeight: 15 },
    weight: 16000,
    footprint: { length: 4100, width: 5100 },
    yearIntroduced: 2020,
  },

  // ==========================================
  // BROTHER SPEEDIO VMCs
  // ==========================================
  {
    id: "brother-speedio-s700xd1",
    manufacturer: "Brother",
    model: "S700 Xd1",
    type: "vmc",
    description: "Ultra-high-speed compact VMC with 30,000 RPM spindle. Brother's Speedio is known for the fastest chip-to-chip times in the industry, ideal for high-volume production tapping.",
    travels: { x: 500, y: 400, z: 320 },
    table: { length: 600, width: 400, maxLoad: 250, tSlotCount: 3, tSlotSize: "14mm @ 100mm" },
    spindle: { maxRPM: 30000, taper: "BT30", power: { kW: 12, hp: 16 }, torque: { Nm: 29, ftLbs: 21 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, maxChipToChip: 1.2 },
    toolMagazine: { capacity: 20, maxToolDiameter: 60, maxToolLength: 200, maxToolWeight: 2 },
    weight: 2400,
    footprint: { length: 1800, width: 2000 },
    yearIntroduced: 2014,
  },
  {
    id: "brother-speedio-r650xd2",
    manufacturer: "Brother",
    model: "R650 Xd2",
    type: "vmc",
    description: "Larger brother Speedio with increased travels and dual spindle support. Maintains the legendary Speedio speed while accommodating bigger workpieces.",
    travels: { x: 650, y: 500, z: 380 },
    table: { length: 800, width: 500, maxLoad: 400, tSlotCount: 3, tSlotSize: "14mm @ 100mm" },
    spindle: { maxRPM: 30000, taper: "BT30", power: { kW: 12.6, hp: 17 }, torque: { Nm: 32, ftLbs: 24 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, maxChipToChip: 1.5 },
    toolMagazine: { capacity: 20, maxToolDiameter: 80, maxToolLength: 250, maxToolWeight: 3 },
    weight: 3000,
    footprint: { length: 2000, width: 2300 },
  },

  // ==========================================
  // DN SOLUTIONS VMCs
  // ==========================================
  {
    id: "dn-dnm-5705",
    manufacturer: "DN Solutions",
    model: "DNM 5705",
    type: "vmc",
    description: "High-performance VMC with box ways and a powerful spindle. The DNM series offers excellent rigidity for heavy cutting in a mid-size package.",
    travels: { x: 1100, y: 570, z: 510 },
    table: { length: 1300, width: 570, maxLoad: 800, tSlotCount: 5, tSlotSize: "18H8 @ 100mm" },
    spindle: { maxRPM: 10000, taper: "BT40", power: { kW: 18.5, hp: 25 }, torque: { Nm: 118, ftLbs: 87 }, driveType: "belt" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 36, y: 36, z: 30, maxChipToChip: 3.8 },
    toolMagazine: { capacity: 30, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 5500,
    footprint: { length: 3100, width: 2600 },
  },
  {
    id: "dn-dvf-6500",
    manufacturer: "DN Solutions",
    model: "DVF 6500",
    type: "vmc",
    description: "5-axis VMC with swivel rotary table for simultaneous 5-axis machining. Designed for complex parts requiring multi-axis interpolation.",
    travels: { x: 800, y: 650, z: 460 },
    table: { length: 680, width: 600, maxLoad: 500, tSlotCount: 4, tSlotSize: "18H8 @ 100mm" },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 26, hp: 35 }, torque: { Nm: 124, ftLbs: 91 }, driveType: "direct" },
    accuracy: { positioning: { mm: 0.004 }, repeatability: { mm: 0.002 }, standard: "ISO 230-2" },
    rapids: { x: 36, y: 36, z: 30, maxChipToChip: 4.5 },
    toolMagazine: { capacity: 40, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 8000,
    footprint: { length: 3400, width: 3400 },
  },
  {
    id: "dn-dhm-6300",
    manufacturer: "DN Solutions",
    model: "DHM 6300",
    type: "hmc",
    description: "Horizontal machining center with dual pallet system. Designed for high-productivity machining in automotive and general manufacturing sectors.",
    travels: { x: 1050, y: 850, z: 850, b: 360 },
    table: { length: 630, width: 630, maxLoad: 1200, palletSize: "630×630", palletChangeTime: 15 },
    spindle: { maxRPM: 10000, taper: "BT50", power: { kW: 37, hp: 50 }, torque: { Nm: 445, ftLbs: 328 }, driveType: "gear", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 36, y: 36, z: 36, b: 12, maxChipToChip: 5.5 },
    toolMagazine: { capacity: 60, maxToolDiameter: 115, maxToolLength: 350, maxToolWeight: 15 },
    weight: 15000,
    footprint: { length: 4800, width: 4500 },
  },

  // ==========================================
  // DMG MORI HMCs
  // ==========================================
  {
    id: "dmg-mori-nhx-4000",
    manufacturer: "DMG MORI",
    model: "NHX 4000",
    type: "hmc",
    description: "Compact horizontal machining center with high-speed pallet changer. Ideal for automotive and contract manufacturing requiring high throughput.",
    travels: { x: 630, y: 560, z: 560, b: 360 },
    table: { length: 400, width: 400, maxLoad: 500, palletSize: "400×400", palletChangeTime: 8 },
    spindle: { maxRPM: 20000, taper: "HSK-A63", power: { kW: 26, hp: 35 }, torque: { Nm: 115, ftLbs: 85 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 60, y: 60, z: 60, b: 25, maxChipToChip: 2.5 },
    toolMagazine: { capacity: 60, maxToolDiameter: 80, maxToolLength: 315, maxToolWeight: 8 },
    weight: 10000,
    footprint: { length: 3700, width: 3800 },
    yearIntroduced: 2018,
  },
  {
    id: "dmg-mori-dmc-80-h",
    manufacturer: "DMG MORI",
    model: "DMC 80 H",
    type: "hmc",
    description: "Large horizontal machining center for heavy-duty machining. Accommodates oversized workpieces with a powerful high-torque spindle.",
    travels: { x: 1250, y: 1000, z: 1000, b: 360 },
    table: { length: 800, width: 800, maxLoad: 2500, palletSize: "800×800", palletChangeTime: 25 },
    spindle: { maxRPM: 6000, taper: "BT50", power: { kW: 37, hp: 50 }, torque: { Nm: 640, ftLbs: 472 }, driveType: "gear", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.008 }, repeatability: { mm: 0.004 }, standard: "ISO 230-2" },
    rapids: { x: 30, y: 30, z: 30, b: 10, maxChipToChip: 10 },
    toolMagazine: { capacity: 60, maxToolDiameter: 125, maxToolLength: 400, maxToolWeight: 20 },
    weight: 25000,
    footprint: { length: 6000, width: 6500 },
  },

  // ==========================================
  // MATSUURA VMCs
  // ==========================================
  {
    id: "matsuura-mam72-35v",
    manufacturer: "Matsuura",
    model: "MAM72-35V",
    type: "vmc",
    description: "5-axis VMC with tilting-rotary table. Known for exceptional surface finish and precision in complex machining. Dual-contact spindle for superior rigidity.",
    travels: { x: 560, y: 460, z: 400 },
    table: { length: 350, width: 350, maxLoad: 200, tSlotCount: 4, tSlotSize: "12H8" },
    spindle: { maxRPM: 20000, taper: "HSK-A63", power: { kW: 22, hp: 30 }, torque: { Nm: 72, ftLbs: 53 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.003 }, repeatability: { mm: 0.001 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, maxChipToChip: 3.0 },
    toolMagazine: { capacity: 60, maxToolDiameter: 80, maxToolLength: 300, maxToolWeight: 8 },
    weight: 7500,
    footprint: { length: 2800, width: 3800 },
    yearIntroduced: 2016,
  },
  {
    id: "matsuura-lbx-521",
    manufacturer: "Matsuura",
    model: "LBX-521",
    type: "vmc",
    description: "Linear motor VMC with ultra-high-speed positioning. The LBX series uses linear motors on all axes for maximum acceleration and precision.",
    travels: { x: 510, y: 410, z: 310 },
    table: { length: 620, width: 420, maxLoad: 300, tSlotCount: 3, tSlotSize: "14H8" },
    spindle: { maxRPM: 30000, taper: "HSK-A40", power: { kW: 18, hp: 24 }, torque: { Nm: 35, ftLbs: 26 }, driveType: "built-in", cooling: "chiller" },
    accuracy: { positioning: { mm: 0.002 }, repeatability: { mm: 0.001 }, standard: "ISO 230-2" },
    rapids: { x: 90, y: 90, z: 90, maxChipToChip: 1.5 },
    toolMagazine: { capacity: 36, maxToolDiameter: 60, maxToolLength: 200, maxToolWeight: 3 },
    weight: 5000,
    footprint: { length: 2400, width: 3200 },
  },

  // ==========================================
  // SODICK VMCs (EDM + Milling)
  // ==========================================
  {
    id: "sodick-mc430l",
    manufacturer: "Sodick",
    model: "MC430L",
    type: "vmc",
    description: "High-precision VMC with linear motor drives on all axes. Sodick's expertise in EDM precision translates to exceptional machining accuracy for hard materials.",
    travels: { x: 430, y: 330, z: 330 },
    table: { length: 600, width: 400, maxLoad: 300, tSlotCount: 4, tSlotSize: "14H8 @ 100mm" },
    spindle: { maxRPM: 30000, taper: "HSK-A40", power: { kW: 10, hp: 13 }, torque: { Nm: 22, ftLbs: 16 }, driveType: "built-in", cooling: "chiller" },
    accuracy: { positioning: { mm: 0.002 }, repeatability: { mm: 0.001 }, standard: "JIS B 6330" },
    rapids: { x: 60, y: 60, z: 60, maxChipToChip: 2.5 },
    toolMagazine: { capacity: 30, maxToolDiameter: 60, maxToolLength: 200, maxToolWeight: 3 },
    weight: 4500,
    footprint: { length: 2200, width: 2800 },
    yearIntroduced: 2017,
  },

  // ==========================================
  // TOYODA HMCs
  // ==========================================
  {
    id: "toyoda-fh630-s",
    manufacturer: "Toyoda",
    model: "FH630-S",
    type: "hmc",
    description: "High-speed horizontal machining center with dual pallet shuttle. Toyoda's patented T-shaped bed design provides exceptional rigidity and thermal stability.",
    travels: { x: 1050, y: 850, z: 850, b: 360 },
    table: { length: 630, width: 630, maxLoad: 1200, palletSize: "630×630", palletChangeTime: 12 },
    spindle: { maxRPM: 14000, taper: "HSK-A63", power: { kW: 37, hp: 50 }, torque: { Nm: 148, ftLbs: 109 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.003 }, repeatability: { mm: 0.0015 }, standard: "ISO 230-2" },
    rapids: { x: 50, y: 50, z: 50, b: 20, maxChipToChip: 3.5 },
    toolMagazine: { capacity: 40, maxToolDiameter: 100, maxToolLength: 350, maxToolWeight: 12 },
    weight: 14000,
    footprint: { length: 4500, width: 4800 },
  },
  {
    id: "toyoda-fh1250-sx",
    manufacturer: "Toyoda",
    model: "FH1250-SX",
    type: "hmc",
    description: "Large-frame horizontal machining center with massive work envelope. Designed for heavy-duty aerospace, energy, and large-part manufacturing.",
    travels: { x: 2000, y: 1600, z: 1600, b: 360 },
    table: { length: 1250, width: 1000, maxLoad: 5000, palletSize: "1250×1000", palletChangeTime: 30 },
    spindle: { maxRPM: 6000, taper: "BT50", power: { kW: 45, hp: 60 }, torque: { Nm: 745, ftLbs: 550 }, driveType: "gear", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.006 }, repeatability: { mm: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 30, y: 20, z: 20, b: 5, maxChipToChip: 15 },
    toolMagazine: { capacity: 60, maxToolDiameter: 130, maxToolLength: 500, maxToolWeight: 30 },
    weight: 35000,
    footprint: { length: 7200, width: 7200 },
  },

  // ==========================================
  // MAZAK HMCs
  // ==========================================
  {
    id: "mazak-hcn-5000",
    manufacturer: "Mazak",
    model: "HCN-5000",
    type: "hmc",
    description: "High-performance horizontal machining center with Mazak's MX hybrid roller guideways. Exceptional speed and accuracy for production environments.",
    travels: { x: 650, y: 600, z: 600, b: 360 },
    table: { length: 500, width: 500, maxLoad: 800, palletSize: "500×500", palletChangeTime: 9 },
    spindle: { maxRPM: 14000, taper: "HSK-A63", power: { kW: 30, hp: 40 }, torque: { Nm: 130, ftLbs: 96 }, driveType: "built-in", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.004 }, repeatability: { mm: 0.002 }, standard: "VDI/DGQ 3441" },
    rapids: { x: 60, y: 60, z: 60, b: 20, maxChipToChip: 2.8 },
    toolMagazine: { capacity: 60, maxToolDiameter: 80, maxToolLength: 350, maxToolWeight: 10 },
    weight: 12000,
    footprint: { length: 3800, width: 3900 },
    yearIntroduced: 2019,
  },
  {
    id: "mazak-hcn-6800",
    manufacturer: "Mazak",
    model: "HCN-6800",
    type: "hmc",
    description: "Large horizontal center with 800mm pallet. High-torque spindle for heavy cutting in steel, cast iron, and other demanding materials.",
    travels: { x: 1100, y: 900, z: 900, b: 360 },
    table: { length: 800, width: 800, maxLoad: 2000, palletSize: "800×800", palletChangeTime: 15 },
    spindle: { maxRPM: 10000, taper: "BT50", power: { kW: 37, hp: 50 }, torque: { Nm: 499, ftLbs: 368 }, driveType: "gear", cooling: "liquid" },
    accuracy: { positioning: { mm: 0.005 }, repeatability: { mm: 0.0025 }, standard: "VDI/DGQ 3441" },
    rapids: { x: 50, y: 50, z: 50, b: 10, maxChipToChip: 6 },
    toolMagazine: { capacity: 80, maxToolDiameter: 100, maxToolLength: 400, maxToolWeight: 15 },
    weight: 20000,
    footprint: { length: 5200, width: 5200 },
  },

  // ==========================================
  // HAAS HMCs
  // ==========================================
  {
    id: "haas-ec-400",
    manufacturer: "Haas Automation",
    model: "EC-400",
    type: "hmc",
    description: "Compact horizontal machining center with dual pallet system. Offers HMC productivity at an accessible price point for job shops transitioning from VMCs.",
    travels: { x: 508, y: 406, z: 406, b: 360 },
    table: { length: 400, width: 400, maxLoad: 408, palletSize: "400×400", palletChangeTime: 8 },
    spindle: { maxRPM: 12000, taper: "BT40", power: { kW: 22.4, hp: 30 }, torque: { Nm: 122, ftLbs: 90 }, driveType: "direct" },
    accuracy: { positioning: { meters: 0.005 }, repeatability: { meters: 0.0025 }, standard: "ISO 230-2" },
    rapids: { x: 35.6, y: 35.6, z: 35.6, b: 20, maxChipToChip: 4.0 },
    toolMagazine: { capacity: 32, maxToolDiameter: 89, maxToolLength: 330, maxToolWeight: 5.4 },
    weight: 5666,
    footprint: { length: 3500, width: 3400 },
  },
  {
    id: "haas-ec-630",
    manufacturer: "Haas Automation",
    model: "EC-630",
    type: "hmc",
    description: "Full-size horizontal machining center with 630mm pallets. High-torque spindle and large tool magazine for complex production parts.",
    travels: { x: 1067, y: 813, z: 813, b: 360 },
    table: { length: 630, width: 630, maxLoad: 1500, palletSize: "630×630", palletChangeTime: 15 },
    spindle: { maxRPM: 7000, taper: "CAT50", power: { kW: 30, hp: 40 }, torque: { Nm: 310, ftLbs: 229 }, driveType: "gear" },
    accuracy: { positioning: { meters: 0.006 }, repeatability: { meters: 0.003 }, standard: "ISO 230-2" },
    rapids: { x: 24, y: 24, z: 24, b: 10, maxChipToChip: 7.0 },
    toolMagazine: { capacity: 60, maxToolDiameter: 114, maxToolLength: 508, maxToolWeight: 13.6 },
    weight: 13154,
    footprint: { length: 5300, width: 4800 },
  },
  {
    id: "haas-ec-1600",
    manufacturer: "Haas Automation",
    model: "EC-1600",
    type: "hmc",
    description: "Large horizontal machining center with 1600mm pallet. Built for oversized, heavy workpieces in aerospace, energy, and heavy equipment manufacturing.",
    travels: { x: 1626, y: 1270, z: 1270, b: 360 },
    table: { length: 1600, width: 1250, maxLoad: 5000, palletSize: "1600×1250", palletChangeTime: 45 },
    spindle: { maxRPM: 4000, taper: "CAT50", power: { kW: 37, hp: 50 }, torque: { Nm: 440, ftLbs: 325 }, driveType: "gear" },
    accuracy: { positioning: { meters: 0.008 }, repeatability: { meters: 0.004 }, standard: "ISO 230-2" },
    rapids: { x: 12, y: 12, z: 12, b: 3, maxChipToChip: 15 },
    toolMagazine: { capacity: 60, maxToolDiameter: 127, maxToolLength: 508, maxToolWeight: 13.6 },
    weight: 31000,
    footprint: { length: 7600, width: 7000 },
  },
];

// ==========================================
// QUERY FUNCTIONS
// ==========================================

export function getMachines(): MachineDefinition[] {
  return [...MACHINES];
}

export function getMachineById(id: string): MachineDefinition | undefined {
  return MACHINES.find((m) => m.id === id);
}

export function getMachinesByType(type: MachineType): MachineDefinition[] {
  return MACHINES.filter((m) => m.type === type);
}

export function getMachinesByManufacturer(
  manufacturer: MachineManufacturer,
): MachineDefinition[] {
  return MACHINES.filter((m) => m.manufacturer === manufacturer);
}

export function getManufacturers(): MachineManufacturer[] {
  const manufacturers = new Set(MACHINES.map((m) => m.manufacturer));
  return Array.from(manufacturers);
}

export function getMachineTypes(): MachineType[] {
  const types = new Set(MACHINES.map((m) => m.type));
  return Array.from(types);
}

export function getTaperOptions(): SpindleTaper[] {
  const tapers = new Set(MACHINES.map((m) => m.spindle.taper));
  return Array.from(tapers);
}
