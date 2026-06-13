/**
 * Coordinate & number formatting for CNC output.
 * Replaces ad-hoc formatNumber() with context-aware formatting.
 */

export interface FormatOptions {
  /** Force decimal places (e.g., 3 for Haas, 2 for Siemens) */
  decimals?: number;
  /** Minimum significant digits before decimal */
  minIntegerDigits?: number;
  /** Whether to strip trailing zeros after decimal (e.g., "10." → "10.") */
  keepTrailingDecimal?: boolean;
  /** Whether to use leading zero (e.g., 0.5 → 0.5 vs .5) */
  leadingZero?: boolean;
  /** Whether to always show sign prefix */
  forceSign?: boolean;
}

const DEFAULT_OPTS: FormatOptions = {
  decimals: 3,
  minIntegerDigits: 1,
  keepTrailingDecimal: false,
  leadingZero: true,
  forceSign: false,
};

/**
 * Format a coordinate/number value for G-code output.
 *
 * - Strips unnecessary trailing zeros
 * - Respects sign formatting
 * - Handles edge cases (NaN, Infinity, -0)
 * - Allows per-format customization
 *
 * Examples:
 *   formatCoordinate(50)       → "50.0"
 *   formatCoordinate(0.5)      → "0.5"
 *   formatCoordinate(-10.250)  → "-10.25"
 *   formatCoordinate(0)        → "0.0"
 *   formatCoordinate(50, { decimals: 0 }) → "50"
 *   formatCoordinate(10.1234, { decimals: 2 }) → "10.12"
 *   formatCoordinate(6, { keepTrailingDecimal: true }) → "6."
 */
export function formatCoordinate(
  value: number,
  opts?: FormatOptions,
): string {
  if (typeof value !== "number" || !isFinite(value)) return "0";

  const options = { ...DEFAULT_OPTS, ...opts };
  const { decimals, minIntegerDigits, keepTrailingDecimal, leadingZero, forceSign } = options;

  // Handle negative zero
  if (Object.is(value, -0)) value = 0;

  // Round to desired decimals
  let formatted: string;
  if (decimals !== undefined) {
    formatted = value.toFixed(decimals);
  } else {
    // Auto-detect significant decimal places (strip trailing zeros)
    formatted = String(parseFloat(value.toPrecision(8)));
  }

  // Ensure minimum integer digits
  if (minIntegerDigits && minIntegerDigits > 1) {
    const parts = formatted.split(".");
    parts[0] = parts[0].padStart(minIntegerDigits, "0");
    formatted = parts.join(".");
  }

  // Handle leading zero
  if (!leadingZero && formatted.startsWith("0.")) {
    formatted = "." + formatted.slice(2);
  } else if (!leadingZero && formatted.startsWith("-0.")) {
    formatted = "-" + formatted.slice(2);
  }

  // Keep trailing decimal point (Haas/Okuma convention)
  if (keepTrailingDecimal && decimals !== 0 && !formatted.includes(".")) {
    formatted += ".";
  }

  // Force sign prefix
  if (forceSign && !formatted.startsWith("-")) {
    formatted = "+" + formatted;
  }

  return formatted;
}

/**
 * Format a Siemens-style coordinate (uses = sign for assignment).
 * Example: X=50.0
 */
export function formatSiemensCoordinate(
  axis: string,
  value: number,
  opts?: FormatOptions,
): string {
  return `${axis}=${formatCoordinate(value, { decimals: 1, ...opts })}`;
}

/**
 * Format a Fanuc-style coordinate.
 * Example: X50.0
 */
export function formatFanucCoordinate(
  axis: string,
  value: number,
  opts?: FormatOptions,
): string {
  return `${axis}${formatCoordinate(value, opts)}`;
}

/**
 * Format a Heidenhain-style coordinate with signed value.
 * Example: X+50.0 or X-10.0
 */
export function formatHeidenhainCoordinate(
  axis: string,
  value: number,
  opts?: FormatOptions,
): string {
  const sign = value >= 0 ? "+" : "";
  return `${axis}${sign}${formatCoordinate(value, opts)}`;
}

/**
 * Round an RPM value to nearest meaningful value.
 */
export function formatRPM(rpm: number): string {
  return String(Math.round(rpm));
}

/**
 * Format a feed rate with appropriate precision.
 */
export function formatFeed(feed: number, opts?: FormatOptions): string {
  return formatCoordinate(feed, { decimals: 1, ...opts });
}
