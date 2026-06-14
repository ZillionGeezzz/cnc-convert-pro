/**
 * Controller family detection utility.
 * Shared between ir/normalizer, converters, and generators.
 */
import type { ControllerFormat } from "../types";

export function getControllerFamily(format: ControllerFormat): string {
  if (format.startsWith("siemens")) return "siemens";
  if (format.startsWith("mitsubishi")) return "fanuc";
  if (format.startsWith("fanuc")) return "fanuc";
  if (format.startsWith("heidenhain")) return "heidenhain";
  if (format.startsWith("mazak")) {
    if (format === "mazak-eia") return "fanuc";
    return "mazak";
  }
  if (format === "okuma-osp") return "fanuc";
  if (format === "haas") return "fanuc";
  if (format === "brother-speedio") return "fanuc";
  if (format === "fagor-8055") return "fanuc";
  if (format === "bosch-mtx") return "siemens";
  return "fanuc";
}
