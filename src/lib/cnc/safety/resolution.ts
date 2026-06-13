/**
 * Machine Resolution & Minimum Command Increment Constants.
 *
 * Each control family has a minimum programmable increment based on the
 * number of decimal places it supports for axis coordinates.
 *
 * These constants are used to:
 * 1. Round coordinates to the machine's resolution before emission
 * 2. Warn when a value is below the minimum command increment
 * 3. Configure coordinate formatting per target format
 */

import type { ControllerFamily } from "../types";
import { getControllerFamily } from "../ir/family";
import type { ControllerFormat } from "../types";

/**
 * Resolution in mm for each controller family.
 * This represents the smallest programmable increment.
 */
export const CONTROL_RESOLUTION_MM: Record<ControllerFamily, number> = {
  fanuc:      0.001,  // 1 micron — standard Fanuc resolution (IS-B/C)
  siemens:    0.001,  // 1 micron — Siemens 840D sl minimum increment
  heidenhain: 0.001,  // 1 micron — Heidenhain TNC standard resolution
  mazak:      0.001,  // 1 micron — Mazak Smooth/Mazatrol
  okuma:      0.001,  // 1 micron — Okuma OSP
  mitsubishi: 0.001,  // 1 micron — Mitsubishi M80/M70
  haas:       0.0001, // 0.1 micron — Haas NGC (higher resolution)
  brother:    0.001,  // 1 micron — Brother Speedio
  fagor:      0.001,  // 1 micron — Fagor 8055
  bosch:      0.001,  // 1 micron — Bosch MTX
};

/**
 * Minimum command increment in mm.
 * Values below this should trigger a warning.
 * Typically 10× the resolution for practical machining.
 */
export const MIN_COMMAND_INCREMENT_MM: Record<ControllerFamily, number> = {
  fanuc:      0.010,  // 10 microns
  siemens:    0.010,  // 10 microns
  heidenhain: 0.010,  // 10 microns
  mazak:      0.010,  // 10 microns
  okuma:      0.010,  // 10 microns
  mitsubishi: 0.010,  // 10 microns
  haas:       0.001,  // 1 micron — Haas accepts finer increments
  brother:    0.010,  // 10 microns
  fagor:      0.010,  // 10 microns
  bosch:      0.010,  // 10 microns
};

/**
 * Default number of decimal places for coordinate output per family.
 */
export const COORDINATE_DECIMALS: Record<ControllerFamily, number> = {
  fanuc:      3,  // X50.000
  siemens:    3,  // X=50.000
  heidenhain: 3,  // X+50.000
  mazak:      3,  // X50.000
  okuma:      3,  // X50.000
  mitsubishi: 3,  // X50.000
  haas:       4,  // X50.0000
  brother:    3,  // X50.000
  fagor:      3,  // X50.000
  bosch:      3,  // X50.000
};

/**
 * Get the machine resolution for a given controller format.
 */
export function getResolution(format: ControllerFormat): number {
  const family = getControllerFamily(format) as ControllerFamily;
  return CONTROL_RESOLUTION_MM[family] ?? 0.001;
}

/**
 * Get the minimum command increment for a given controller format.
 */
export function getMinIncrement(format: ControllerFormat): number {
  const family = getControllerFamily(format) as ControllerFamily;
  return MIN_COMMAND_INCREMENT_MM[family] ?? 0.010;
}

/**
 * Get the recommended decimal places for coordinate output.
 */
export function getDecimals(format: ControllerFormat): number {
  const family = getControllerFamily(format) as ControllerFamily;
  return COORDINATE_DECIMALS[family] ?? 3;
}

/**
 * Round a value to the machine's resolution.
 */
export function roundToResolution(
  value: number,
  format: ControllerFormat,
): number {
  const res = getResolution(format);
  return Math.round(value / res) * res;
}

/**
 * Check if a command value is below the minimum command increment.
 * Returns null if OK, or a warning message if too small.
 */
export function checkMinIncrement(
  value: number,
  format: ControllerFormat,
  label: string,
): string | null {
  const minInc = getMinIncrement(format);
  const absVal = Math.abs(value);
  if (absVal > 0 && absVal < minInc) {
    return `${label} value ${absVal} is below minimum command increment of ${minInc} for ${format}`;
  }
  return null;
}
