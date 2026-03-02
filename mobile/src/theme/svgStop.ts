interface SvgStopColor {
  stopColor: string;
  stopOpacity?: number;
}

const RGBA_PATTERN =
  /^rgba\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)$/i;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parseRgba(color: string): SvgStopColor {
  const normalized = color.trim();
  const rgbaMatch = normalized.match(RGBA_PATTERN);

  if (!rgbaMatch) {
    return { stopColor: normalized };
  }

  const [, red, green, blue, alpha] = rgbaMatch;
  const stopOpacity = clamp(Number(alpha), 0, 1);

  return {
    stopColor: `rgb(${red},${green},${blue})`,
    stopOpacity,
  };
}

export const toSvgStopColor = parseRgba;
