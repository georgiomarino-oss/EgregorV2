export interface LinearGradientPoints {
  end: { x: number; y: number };
  start: { x: number; y: number };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// CSS/Figma linear-gradient angle:
// 0deg = top, 90deg = right, 180deg = bottom, 270deg = left.
export function cssAngleToLinearPoints(angleDeg: number): LinearGradientPoints {
  const radians = (angleDeg * Math.PI) / 180;
  const vectorX = Math.sin(radians);
  const vectorY = -Math.cos(radians);

  const start = {
    x: clamp(0.5 - vectorX / 2, 0, 1),
    y: clamp(0.5 - vectorY / 2, 0, 1),
  };

  const end = {
    x: clamp(0.5 + vectorX / 2, 0, 1),
    y: clamp(0.5 + vectorY / 2, 0, 1),
  };

  return { end, start };
}
